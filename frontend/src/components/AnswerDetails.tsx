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

  return (
    <div className="answer-body">
      <p className="answer-summary">{answer.summary}</p>

      {answer.columns.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {answer.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((value, c) => (
                    <td key={c} className={typeof value === 'number' ? 'num' : undefined}>
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
  const parts: string[] = [`${usage.provider}:${usage.model}`];
  if (usage.totalTokens !== null) parts.push(`${usage.totalTokens.toLocaleString('en-US')} tokens`);
  if (usage.latencyMs !== null) parts.push(`${usage.latencyMs.toLocaleString('en-US')} ms`);
  if (usage.estimatedCostUsd !== null && usage.estimatedCostUsd > 0) {
    parts.push(`$${usage.estimatedCostUsd.toFixed(4)}`);
  }
  return <p className="muted usage-meta">{parts.join(' · ')}</p>;
}

function renderCell(value: Primitive): string {
  if (value === null) return '—';
  return String(value);
}
