import type { Question } from '../types/question';
import { AnswerDetails } from './AnswerDetails';

interface Props {
  // True from submit until the created question id is known (before polling).
  submitting: boolean;
  // The polled question (null until the first poll returns).
  question: Question | null;
  // A polling/submit error to surface (non-fatal; polling continues).
  error: string | null;
}

// Renders the "Answer" panel on the Ask page across every state: submitting,
// processing, answered, refused, failed, or idle.
export function QuestionAnswer({ submitting, question, error }: Props) {
  const processing = submitting || question?.status === 'PROCESSING';

  return (
    <section className="panel answer-panel">
      <h3>Answer</h3>

      {question && <p className="answer-question muted">“{question.question}”</p>}

      {processing ? (
        <div className="answer-loading">
          <span className="spinner spinner-lg" aria-hidden="true" />
          <span>Answering your question…</span>
        </div>
      ) : question?.status === 'ANSWERED' && question.answer ? (
        <AnswerDetails question={question} />
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
