import type { LlmUsage, Primitive, Question } from '../types/question';

// Cap on rendered rows — the backend already limits results, this just keeps the
// DOM light for wide/tall tables.
const DISPLAY_ROW_LIMIT = 100;

// The body of an ANSWERED question: summary, result table, generated SQL, and
// LLM usage. Shared by the Ask page and the question history so both render
// answers identically. Assumes `question.answer` is present.
export function AnswerDetails({ question }: { question: Question }) {
  const answer = question.answer!;
  const rows = answer.rows.slice(0, DISPLAY_ROW_LIMIT);
  const truncated = answer.rowCount > rows.length;
  const numericColumns = answer.columns.map((_, colIndex) => isNumericColumn(rows, colIndex));

  return (
    <div className="answer-body">
      <p className="answer-summary">{answer.summary}</p>

      {answer.columns.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {answer.columns.map((col, colIndex) => (
                  <th key={col} className={numericColumns[colIndex] ? 'num' : undefined}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((value, c) => (
                    <td key={c} className={numericColumns[c] ? 'num' : undefined}>
                      {renderCell(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted answer-rowcount">
        {answer.rowCount.toLocaleString('en-US')} {answer.rowCount === 1 ? 'row' : 'rows'}
        {truncated ? ` (showing first ${rows.length})` : ''}
      </p>

      {question.generatedSql && (
        <details className="sql-details">
          <summary>View generated SQL</summary>
          <pre className="sql-code">{question.generatedSql}</pre>
        </details>
      )}

      {question.usage && <UsageMeta usage={question.usage} />}
    </div>
  );
}

function UsageMeta({ usage }: { usage: LlmUsage }) {
  return (
    <dl className="usage-meta">
      <UsageItem label="Model" value={`${usage.provider}:${usage.model}`} />
      <UsageItem label="Input" value={formatTokens(usage.promptTokens)} />
      <UsageItem label="Output" value={formatTokens(usage.completionTokens)} />
      <UsageItem label="Total" value={formatTokens(usage.totalTokens)} />
      <UsageItem label="Cost" value={formatCost(usage.estimatedCostUsd)} />
      {usage.latencyMs !== null && <UsageItem label="Latency" value={`${usage.latencyMs.toLocaleString('en-US')} ms`} />}
    </dl>
  );
}

function UsageItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="usage-item">
      <dt className="usage-label">{label}</dt>
      <dd className="usage-value">{value}</dd>
    </div>
  );
}

function formatTokens(tokens: number | null): string {
  return tokens === null ? '—' : tokens.toLocaleString('en-US');
}

function formatCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  // Per-query costs are tiny; show more precision for sub-cent amounts.
  return `$${cost.toFixed(cost < 0.01 ? 6 : 4)}`;
}

function isNumericColumn(rows: Primitive[][], colIndex: number): boolean {
  for (const row of rows) {
    const value = row[colIndex];
    if (value !== null) return typeof value === 'number';
  }
  return false;
}

function renderCell(value: Primitive): string {
  if (value === null) return '—';
  return String(value);
}
