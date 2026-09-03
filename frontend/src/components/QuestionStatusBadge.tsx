import type { QuestionStatus } from '../types/question';

// Status pill for a question, mirroring DatasetStatusBadge's look.
export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  if (status === 'PROCESSING') {
    return (
      <span className="badge badge-processing">
        <span className="spinner" aria-hidden="true" />
        Processing
      </span>
    );
  }
  if (status === 'ANSWERED') {
    return (
      <span className="badge badge-ready">
        <span className="badge-dot" aria-hidden="true" />
        Answered
      </span>
    );
  }
  if (status === 'REFUSED') {
    return (
      <span className="badge badge-refused">
        <span className="badge-dot" aria-hidden="true" />
        Refused
      </span>
    );
  }
  return (
    <span className="badge badge-failed">
      <span className="badge-dot" aria-hidden="true" />
      Failed
    </span>
  );
}
