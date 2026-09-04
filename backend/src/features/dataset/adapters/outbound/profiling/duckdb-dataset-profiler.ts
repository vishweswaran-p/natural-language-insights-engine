import { DuckDBInstance } from '@duckdb/node-api';
import type {
  ColumnMetadata,
  ColumnStats,
  ColumnType,
  DatasetMetadata,
  DatasetWarning,
  Primitive,
  TopValue,
} from '@app/features/dataset/application/domain/dataset-metadata';
import type { DatasetProfiler, ProfileDatasetInput } from '@app/features/dataset/application/ports/dataset-profiler';
import { getLogger } from '@app/shared/logging';

const log = getLogger('duckdb-profiler');

// The only file that imports DuckDB: profiles a CSV through an in-memory connection
// and returns domain DatasetMetadata. DuckDB specifics never leak past this adapter.

const MAX_SAMPLE_VALUES = 5; // example values kept per column (preview only, not used in stats)
const MAX_STRING_LENGTH = 200; // truncate long string values in samples/top values
const TOP_VALUES_MAX_DISTINCT = 50; // only build topValues for low-cardinality columns
const TOP_VALUES_LIMIT = 10;
const HIGH_CARDINALITY_RATIO = 0.9;
const HIGH_CARDINALITY_MIN_ROWS = 100;

type ColumnInfo = { name: string; duckType: string; type: ColumnType };

export class DuckDbDatasetProfiler implements DatasetProfiler {
  async profile({ storagePath, filename, parquetOutputPath }: ProfileDatasetInput): Promise<DatasetMetadata> {
    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    try {
      // Controlled relation over the uploaded CSV. The path is app-controlled and
      // still escaped as a string literal; column identifiers are quoted safely.
      await connection.run(
        `CREATE OR REPLACE TEMP VIEW dataset AS SELECT * FROM read_csv_auto(${quoteLiteral(storagePath)}, header = true)`,
      );

      const columns = await describeColumns(connection);
      const rowCount = await queryScalarNumber(connection, 'SELECT count(*) AS c FROM dataset');

      log.info('Computing column statistics', { filename, rowCount, columnCount: columns.length });

      const counts = await queryColumnCounts(connection, columns);
      const numericStats = await queryNumericStats(connection, columns);
      const temporalStats = await queryTemporalStats(connection, columns);

      const warnings: DatasetWarning[] = [];
      const columnMetadata: ColumnMetadata[] = [];

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const nonNull = counts[`c${i}_nn`] ?? 0;
        const distinctCount = counts[`c${i}_dc`] ?? 0;
        const nullCount = Math.max(rowCount - nonNull, 0);
        const nullPercentage = percentage(nullCount, rowCount);
        const uniquenessRatio = rowCount > 0 ? round(distinctCount / rowCount, 4) : undefined;

        const sampleValues = await querySampleValues(connection, col.name);
        const stats = buildStats(col, i, numericStats, temporalStats);
        const topValues = await maybeQueryTopValues(connection, col.name, distinctCount, rowCount);

        columnMetadata.push({
          name: col.name,
          type: col.type,
          nullable: nullCount > 0,
          nullCount,
          nullPercentage,
          distinctCount,
          uniquenessRatio,
          sampleValues,
          stats,
          topValues,
        });

        collectColumnWarnings(warnings, col, {
          nullCount,
          nullPercentage,
          negativeCount: stats?.negativeCount,
          distinctCount,
          uniquenessRatio,
          rowCount,
        });
      }

      if (parquetOutputPath) {
        await connection.run(
          `COPY (SELECT * FROM dataset) TO ${quoteLiteral(parquetOutputPath)} (FORMAT PARQUET)`,
        );
        log.info('Parquet materialized', { filename, parquetOutputPath, rowCount });
      }

      return {
        version: '1',
        dataset: { filename, rowCount, columnCount: columns.length },
        columns: columnMetadata,
        warnings,
        profiling: {
          generatedAt: new Date().toISOString(),
          statisticsMode: 'full',
          queryFormat: parquetOutputPath ? 'parquet' : 'csv',
        },
      };
    } finally {
      connection.closeSync();
      instance.closeSync();
    }
  }
}

// --- DuckDB access helpers -------------------------------------------------

type DuckConnection = Awaited<ReturnType<DuckDBInstance['connect']>>;

async function describeColumns(connection: DuckConnection): Promise<ColumnInfo[]> {
  const reader = await connection.runAndReadAll('DESCRIBE dataset');
  return reader.getRowObjects().map((row) => {
    const duckType = String(row.column_type);
    return { name: String(row.column_name), duckType, type: mapDuckType(duckType) };
  });
}

async function queryScalarNumber(connection: DuckConnection, sql: string): Promise<number> {
  const reader = await connection.runAndReadAll(sql);
  return toNumber(reader.getRowObjects()[0]?.c) ?? 0;
}

// One scan: non-null and distinct counts for every column (positional aliases
// keep result keys safe regardless of the source column names).
async function queryColumnCounts(connection: DuckConnection, columns: ColumnInfo[]): Promise<Record<string, number>> {
  if (columns.length === 0) return {};
  const parts = columns.flatMap((col, i) => [
    `count(${quoteIdent(col.name)}) AS c${i}_nn`,
    `count(DISTINCT ${quoteIdent(col.name)}) AS c${i}_dc`,
  ]);
  const reader = await connection.runAndReadAll(`SELECT ${parts.join(', ')} FROM dataset`);
  const row = reader.getRowObjects()[0] ?? {};
  const out: Record<string, number> = {};
  for (const key of Object.keys(row)) out[key] = toNumber(row[key]) ?? 0;
  return out;
}

// One scan over numeric columns: min/max/avg/median + zero/negative counts.
async function queryNumericStats(connection: DuckConnection, columns: ColumnInfo[]): Promise<Record<string, unknown>> {
  const parts: string[] = [];
  columns.forEach((col, i) => {
    if (col.type !== 'integer' && col.type !== 'decimal') return;
    const id = quoteIdent(col.name);
    parts.push(
      `min(${id})::DOUBLE AS c${i}_min`,
      `max(${id})::DOUBLE AS c${i}_max`,
      `avg(${id})::DOUBLE AS c${i}_avg`,
      `quantile_cont(${id}, 0.5) AS c${i}_med`,
      `count(*) FILTER (WHERE ${id} = 0) AS c${i}_zero`,
      `count(*) FILTER (WHERE ${id} < 0) AS c${i}_neg`,
    );
  });
  if (parts.length === 0) return {};
  const reader = await connection.runAndReadAll(`SELECT ${parts.join(', ')} FROM dataset`);
  return reader.getRowObjects()[0] ?? {};
}

// One scan over date/timestamp columns: min/max only.
async function queryTemporalStats(connection: DuckConnection, columns: ColumnInfo[]): Promise<Record<string, unknown>> {
  const parts: string[] = [];
  columns.forEach((col, i) => {
    if (col.type !== 'date' && col.type !== 'timestamp') return;
    const id = quoteIdent(col.name);
    parts.push(`min(${id}) AS c${i}_tmin`, `max(${id}) AS c${i}_tmax`);
  });
  if (parts.length === 0) return {};
  const reader = await connection.runAndReadAll(`SELECT ${parts.join(', ')} FROM dataset`);
  return reader.getRowObjects()[0] ?? {};
}

async function querySampleValues(connection: DuckConnection, columnName: string): Promise<Primitive[]> {
  const id = quoteIdent(columnName);
  const reader = await connection.runAndReadAll(
    `SELECT ${id} AS v FROM dataset WHERE ${id} IS NOT NULL LIMIT ${MAX_SAMPLE_VALUES}`,
  );
  return reader.getRowObjects().map((row) => toPrimitive(row.v));
}

async function maybeQueryTopValues(
  connection: DuckConnection,
  columnName: string,
  distinctCount: number,
  rowCount: number,
): Promise<TopValue[] | undefined> {
  if (distinctCount <= 0 || distinctCount > TOP_VALUES_MAX_DISTINCT) return undefined;
  const id = quoteIdent(columnName);
  const reader = await connection.runAndReadAll(
    `SELECT ${id} AS v, count(*) AS cnt FROM dataset WHERE ${id} IS NOT NULL
     GROUP BY ${id} ORDER BY cnt DESC, v LIMIT ${TOP_VALUES_LIMIT}`,
  );
  return reader.getRowObjects().map((row) => {
    const count = toNumber(row.cnt) ?? 0;
    return { value: toPrimitive(row.v), count, percentage: percentage(count, rowCount) };
  });
}

// --- pure mapping/formatting helpers --------------------------------------

function buildStats(
  col: ColumnInfo,
  i: number,
  numeric: Record<string, unknown>,
  temporal: Record<string, unknown>,
): ColumnStats | undefined {
  if (col.type === 'integer' || col.type === 'decimal') {
    const stats: ColumnStats = {
      min: toPrimitive(numeric[`c${i}_min`]),
      max: toPrimitive(numeric[`c${i}_max`]),
      avg: toNumber(numeric[`c${i}_avg`]),
      median: toNumber(numeric[`c${i}_med`]),
      zeroCount: toNumber(numeric[`c${i}_zero`]) ?? 0,
      negativeCount: toNumber(numeric[`c${i}_neg`]) ?? 0,
    };
    return stats;
  }
  if (col.type === 'date' || col.type === 'timestamp') {
    return { min: toPrimitive(temporal[`c${i}_tmin`]), max: toPrimitive(temporal[`c${i}_tmax`]) };
  }
  return undefined;
}

function collectColumnWarnings(
  warnings: DatasetWarning[],
  col: ColumnInfo,
  info: {
    nullCount: number;
    nullPercentage: number;
    negativeCount?: number;
    distinctCount: number;
    uniquenessRatio?: number;
    rowCount: number;
  },
): void {
  if (info.nullCount > 0) {
    warnings.push({
      type: 'NULL_VALUES',
      column: col.name,
      message: `Column '${col.name}' contains ${info.nullCount} null value(s) (${info.nullPercentage}%).`,
    });
  }
  if (info.negativeCount && info.negativeCount > 0) {
    warnings.push({
      type: 'NEGATIVE_VALUES',
      column: col.name,
      message: `Column '${col.name}' contains ${info.negativeCount} negative value(s).`,
    });
  }
  if (col.type === 'unknown') {
    warnings.push({
      type: 'TYPE_INFERENCE',
      column: col.name,
      message: `Column '${col.name}' has an unrecognized type ('${col.duckType}') and was recorded as unknown.`,
    });
  }
  if (
    info.uniquenessRatio !== undefined &&
    info.uniquenessRatio >= HIGH_CARDINALITY_RATIO &&
    info.rowCount >= HIGH_CARDINALITY_MIN_ROWS
  ) {
    warnings.push({
      type: 'HIGH_CARDINALITY',
      column: col.name,
      message: `Column '${col.name}' has high cardinality (${info.distinctCount} distinct values across ${info.rowCount} rows).`,
    });
  }
}

// Map DuckDB type strings to the domain ColumnType. Isolated here so DuckDB
// specifics never leak into DatasetMetadata.
function mapDuckType(duckType: string): ColumnType {
  const t = duckType.toUpperCase();
  if (/^(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UTINYINT|USMALLINT|UINTEGER|UBIGINT)$/.test(t)) return 'integer';
  if (t.startsWith('DECIMAL') || /^(FLOAT|REAL|DOUBLE)$/.test(t)) return 'decimal';
  if (/^(VARCHAR|CHAR|BPCHAR|TEXT|STRING)$/.test(t)) return 'string';
  if (t === 'BOOLEAN' || t === 'BOOL') return 'boolean';
  if (t === 'DATE') return 'date';
  if (t.startsWith('TIMESTAMP') || t === 'TIME') return 'timestamp';
  return 'unknown';
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  const n = Number(String(value));
  return Number.isNaN(n) ? undefined : n;
}

function toPrimitive(value: unknown): Primitive {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  if (typeof value === 'string') return truncate(value);
  return truncate(String(value)); // dates/timestamps/decimals arrive as value objects
}

function truncate(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function percentage(part: number, whole: number): number {
  return whole > 0 ? round((part / whole) * 100, 2) : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
