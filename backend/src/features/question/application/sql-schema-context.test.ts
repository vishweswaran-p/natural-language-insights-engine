import { describe, expect, it } from 'vitest';
import type { DatasetMetadata } from '@app/features/dataset/application/domain/dataset-metadata';
import { datasetSchemaFromMetadata, formatSchemaForPrompt } from './sql-schema-context';

function metadata(
  columns: DatasetMetadata['columns'],
  warnings: DatasetMetadata['warnings'] = [],
): DatasetMetadata {
  return {
    version: '1',
    dataset: { filename: 'test.csv', rowCount: 100, columnCount: columns.length },
    columns,
    warnings,
    profiling: { generatedAt: '2026-01-01T00:00:00.000Z', statisticsMode: 'full', queryFormat: 'parquet' },
  };
}

describe('sql schema context', () => {
  it('adds cast hint for string columns that look like timestamps', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'transaction_timestamp',
          type: 'string',
          nullable: false,
          nullCount: 0,
          nullPercentage: 0,
          sampleValues: ['2024-03-15T10:00:00'],
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('CAST to TIMESTAMP');
    expect(block).toContain('"2024-03-15T10:00:00"');
  });

  it('notes timestamp columns can use date functions directly', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'created_at',
          type: 'timestamp',
          nullable: false,
          nullCount: 0,
          nullPercentage: 0,
          sampleValues: ['2024-03-15T10:00:00'],
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('use with EXTRACT/DATE_TRUNC/date_diff directly');
  });

  it('includes nullable percentage when column has nulls', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'notes',
          type: 'string',
          nullable: true,
          nullCount: 12,
          nullPercentage: 12.4,
          sampleValues: ['hello', null],
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('nullable: 12%');
  });

  it('includes distinct count and top values for low-cardinality columns', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'payment_method',
          type: 'string',
          nullable: false,
          nullCount: 0,
          nullPercentage: 0,
          distinctCount: 4,
          sampleValues: ['card'],
          topValues: [
            { value: 'card', count: 50, percentage: 50 },
            { value: 'paypal', count: 30, percentage: 30 },
            { value: 'bank', count: 15, percentage: 15 },
            { value: 'cash', count: 5, percentage: 5 },
          ],
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('distinct: 4');
    expect(block).toContain('top: "card", "paypal", "bank"');
    expect(block).not.toContain('"cash"');
  });

  it('omits distinct and top values for high-cardinality columns', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'order_id',
          type: 'string',
          nullable: false,
          nullCount: 0,
          nullPercentage: 0,
          distinctCount: 999,
          sampleValues: ['ORD-1'],
          topValues: [{ value: 'ORD-1', count: 1, percentage: 0.1 }],
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).not.toContain('distinct:');
    expect(block).not.toContain('top:');
  });

  it('includes numeric range from stats', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([
        {
          name: 'amount',
          type: 'decimal',
          nullable: false,
          nullCount: 0,
          nullPercentage: 0,
          sampleValues: [42.5],
          stats: { min: 10, max: 500, avg: 100 },
        },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('range: 10–500');
  });

  it('includes up to three dataset-level warnings', () => {
    const schema = datasetSchemaFromMetadata(
      metadata([], [
        { type: 'TYPE_INFERENCE', column: 'transaction_timestamp', message: 'transaction_timestamp inferred as string' },
        { type: 'NULL_VALUES', column: 'notes', message: 'notes has 12% null values' },
        { type: 'OTHER', message: 'third warning' },
        { type: 'OTHER', message: 'fourth warning should be omitted' },
      ]),
    );

    const block = formatSchemaForPrompt(schema);
    expect(block).toContain('Warnings:');
    expect(block).toContain('- transaction_timestamp inferred as string');
    expect(block).toContain('- notes has 12% null values');
    expect(block).toContain('- third warning');
    expect(block).not.toContain('fourth warning should be omitted');
  });
});
