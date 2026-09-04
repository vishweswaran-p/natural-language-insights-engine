import { describe, expect, it } from 'vitest';
import { GuardrailError, validateReadOnlySql } from './sql-guardrail';

describe('validateReadOnlySql', () => {
  it('allows a simple SELECT and strips a trailing semicolon', () => {
    expect(validateReadOnlySql('SELECT * FROM dataset;')).toBe('SELECT * FROM dataset');
  });

  it('allows a WITH (CTE) query', () => {
    const sql =
      'WITH totals AS (SELECT region, SUM(revenue) AS total FROM dataset GROUP BY region) SELECT * FROM totals';
    expect(validateReadOnlySql(sql)).toBe(sql);
  });

  it('rejects an empty query', () => {
    expect(() => validateReadOnlySql('   ')).toThrow(GuardrailError);
    expect(() => validateReadOnlySql('   ')).toThrow(/empty/i);
  });

  it('rejects multiple statements', () => {
    expect(() => validateReadOnlySql('SELECT 1; DROP TABLE dataset')).toThrow(GuardrailError);
    expect(() => validateReadOnlySql('SELECT 1; DROP TABLE dataset')).toThrow(/single SQL statement/i);
  });

  it('rejects non-SELECT statements', () => {
    expect(() => validateReadOnlySql('EXPLAIN SELECT 1')).toThrow(GuardrailError);
    expect(() => validateReadOnlySql('EXPLAIN SELECT 1')).toThrow(/read-only SELECT/i);
  });

  it('does not false-positive on column names like created_at', () => {
    const sql = 'SELECT created_at, updated_at FROM dataset';
    expect(validateReadOnlySql(sql)).toBe(sql);
  });

  it('rejects write statements even when they look like normal SQL', () => {
    for (const sql of [
      'INSERT INTO dataset VALUES (1)',
      'UPDATE dataset SET revenue = 0',
      'DELETE FROM dataset',
      'DROP TABLE dataset',
    ]) {
      expect(() => validateReadOnlySql(sql)).toThrow(GuardrailError);
    }
  });

  it('rejects external file access inside a SELECT', () => {
    expect(() => validateReadOnlySql("SELECT * FROM read_csv_auto('file.csv')")).toThrow(GuardrailError);
    expect(() => validateReadOnlySql("SELECT * FROM read_csv_auto('file.csv')")).toThrow(/external file access/i);
  });

  it('rejects system/I/O operations inside a SELECT', () => {
    expect(() => validateReadOnlySql("COPY dataset TO '/tmp/out.csv'")).toThrow(GuardrailError);
    // COPY is not a SELECT, so it is caught by the read-only check first.
    expect(() => validateReadOnlySql("COPY dataset TO '/tmp/out.csv'")).toThrow(/read-only SELECT/i);
  });
});
