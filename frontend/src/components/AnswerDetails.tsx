import type { Primitive, Question } from '../types/question';
import { QuestionProvenance } from './QuestionProvenance';

const DISPLAY_ROW_LIMIT = 100;

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

      <QuestionProvenance question={question} />
    </div>
  );
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
