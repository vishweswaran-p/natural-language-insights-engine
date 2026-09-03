// Guardrail: the model-generated SQL must be a single read-only SELECT before
// we execute it. This is the primary defense that stops a bad/hostile query
// from running — pure logic, no infrastructure, so it is easy to test.

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardrailError';
  }
}

// Word-boundary patterns catch dangerous operations without false-positives on
// column names (e.g. `created_at` does not match `create`).
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(insert|update|delete|drop|alter|create|truncate)\b/i, reason: 'data modification' },
  { pattern: /\b(attach|detach|copy|export|import|install|load|pragma)\b/i, reason: 'system or I/O operation' },
  { pattern: /\bread_(csv|parquet|json)/i, reason: 'external file access' },
];

// Returns the normalized SQL (single trailing semicolon stripped) or throws.
export function validateReadOnlySql(rawSql: string): string {
  const sql = rawSql.trim().replace(/;\s*$/, '');

  if (sql.length === 0) {
    throw new GuardrailError('The generated query was empty.');
  }
  if (sql.includes(';')) {
    throw new GuardrailError('Only a single SQL statement is allowed.');
  }
  if (!/^(select|with)\b/i.test(sql)) {
    throw new GuardrailError('Only read-only SELECT queries are allowed.');
  }
  for (const { pattern, reason } of FORBIDDEN) {
    if (pattern.test(sql)) {
      throw new GuardrailError(`The generated query used a disallowed operation (${reason}).`);
    }
  }

  return sql;
}
