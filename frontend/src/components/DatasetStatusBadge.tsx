import type { DatasetStatus } from '../types/dataset';

export function DatasetStatusBadge({ status }: { status: DatasetStatus }) {
  if (status === 'PROCESSING') {
    return (
      <span className="badge badge-processing">
        <span className="spinner" aria-hidden="true" />
        Processing
      </span>
    );
  }
  if (status === 'READY') {
    return (
      <span className="badge badge-ready">
        <span className="badge-dot" aria-hidden="true" />
        Ready
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
