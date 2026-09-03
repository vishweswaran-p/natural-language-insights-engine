import type { LlmUsage, Primitive, Question } from '../types/question';

interface Props {
  // True from submit until the created question id is known (before polling).
  submitting: boolean;
  // The polled question (null until the first poll returns).
  question: Question | null;
  // A polling/submit error to surface (non-fatal; polling continues).
  error: string | null;
}

// Cap on rendered rows — the backend already limits results, this just keeps the
// DOM light for wide/tall tables.
const DISPLAY_ROW_LIMIT = 100;

// Renders the "Answer" panel across every state: submitting, processing,
// answered, refused, failed, or idle.
export function QuestionAnswer({ submitting, question, error }: Props) {
  const processing = submitting || question?.status === 'PROCESSING';

  return (
    <section className="panel answer-panel">
      <h3>Answer</h3>

      {question && (
        <p className="answer-question muted">
          “{question.question}”
        </p>
      )}

      {processing ? (
        <div className="answer-loading">
          <span className="spinner spinner-lg" aria-hidden="true" />
          <span>Answering your question…</span>
        </div>
      ) : question?.status === 'ANSWERED' && question.answer ? (
        <Answered question={question} />
      ) : question?.status === 'REFUSED' ? (
        <div className="banner banner-info">
          {question.refusalReason ?? 'This question cannot be answered from the dataset.'}
        </div>
      ) : question?.status === 'FAILED' ? (
        <div className="banner banner-error" role="alert">
          {question.errorMessage ?? 'Something went wrong while answering this question.'}
        </div>
      ) : (
        <p className="muted">Ask a question above and the answer will appear here.</p>
      )}

      {error && !question && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

function Answered({ question }: { question: Question }) {
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
