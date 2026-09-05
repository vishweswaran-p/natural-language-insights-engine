import type { ColumnType, DatasetMetadata, Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { DatasetSchema, SchemaColumn } from '@app/features/question/application/ports/llm-provider';

const MAX_SAMPLES = 2;
const MAX_TOP_VALUES = 3;
const MAX_WARNINGS = 3;
const LOW_CARDINALITY_THRESHOLD = 50;
const ISO_DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

const RANGE_TYPES: ColumnType[] = ['integer', 'decimal', 'date', 'timestamp'];

export function datasetSchemaFromMetadata(metadata: DatasetMetadata): DatasetSchema {
  return {
    table: 'dataset',
    rowCount: metadata.dataset.rowCount,
    columns: metadata.columns.map(toSchemaColumn),
    warnings: metadata.warnings.slice(0, MAX_WARNINGS).map((warning) => warning.message),
  };
}

export function formatSchemaForPrompt(schema: DatasetSchema): string {
  const lines: string[] = [`Table: ${schema.table} (${schema.rowCount} rows)`];
  if (schema.warnings.length > 0) {
    lines.push('Warnings:', ...schema.warnings.map((warning) => `- ${warning}`));
  }
  lines.push('Columns:', ...schema.columns.map(formatColumnLine));
  return lines.join('\n');
}

function toSchemaColumn(column: DatasetMetadata['columns'][number]): SchemaColumn {
  const distinctCount = column.distinctCount;
  const lowCardinality =
    distinctCount !== undefined && distinctCount <= LOW_CARDINALITY_THRESHOLD;

  return {
    name: column.name,
    type: column.type,
    sampleValues: column.sampleValues.slice(0, MAX_SAMPLES),
    nullPercentage: column.nullPercentage,
    distinctCount: lowCardinality ? distinctCount : undefined,
    topValues: lowCardinality ? column.topValues?.slice(0, MAX_TOP_VALUES) : undefined,
    stats:
      RANGE_TYPES.includes(column.type) && column.stats
        ? { min: column.stats.min, max: column.stats.max }
        : undefined,
  };
}

function formatColumnLine(column: SchemaColumn): string {
  const parts: string[] = [`- "${column.name}" (${column.type})`];

  const hint = columnHint(column);
  if (hint) parts.push(hint);

  if (column.nullPercentage > 0) {
    parts.push(`nullable: ${Math.round(column.nullPercentage)}%`);
  }

  if (column.distinctCount !== undefined) {
    parts.push(`distinct: ${column.distinctCount}`);
    if (column.topValues && column.topValues.length > 0) {
      parts.push(`top: ${column.topValues.map((entry) => formatSample(entry.value)).join(', ')}`);
    }
  }

  const range = formatRange(column);
  if (range) parts.push(`range: ${range}`);

  if (column.sampleValues.length > 0) {
    parts.push(`examples: ${column.sampleValues.map(formatSample).join(', ')}`);
  }

  return parts.join('; ');
}

function formatRange(column: SchemaColumn): string | null {
  if (!RANGE_TYPES.includes(column.type) || !column.stats) return null;
  const { min, max } = column.stats;
  if (min === undefined && max === undefined) return null;
  if (min === undefined) return formatSample(max!);
  if (max === undefined) return formatSample(min);
  return `${formatSample(min)}–${formatSample(max)}`;
}

function columnHint(column: SchemaColumn): string | null {
  if (column.type === 'timestamp' || column.type === 'date') {
    return 'use with EXTRACT/DATE_TRUNC/date_diff directly';
  }
  if (column.type === 'string' && looksLikeDateColumn(column.name, column.sampleValues)) {
    return 'stored as text; CAST to TIMESTAMP before EXTRACT/DATE_TRUNC/date_diff';
  }
  return null;
}

function looksLikeDateColumn(name: string, samples: Primitive[]): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('date') || lower.includes('time') || lower.endsWith('_at')) return true;
  return samples.some((value) => typeof value === 'string' && ISO_DATE_LIKE.test(value));
}

function formatSample(value: Primitive): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}
