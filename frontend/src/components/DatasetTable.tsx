import type { Dataset } from '../types/dataset';
import { formatBytes } from '../utils/formatBytes';
import { formatDate } from '../utils/formatDate';
import { DatasetStatusBadge } from './DatasetStatusBadge';

interface Props {
  datasets: Dataset[];
  selectedId: string | null;
  onView: (id: string) => void;
}

// Row/column counts are only meaningful once profiling is done.
function metric(dataset: Dataset, key: 'rowCount' | 'columnCount'): string {
  if (dataset.status !== 'READY' || !dataset.metadata) return '—';
  return dataset.metadata.dataset[key].toLocaleString('en-US');
}

export function DatasetTable({ datasets, selectedId, onView }: Props) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>Size</th>
            <th>Status</th>
            <th className="num">Rows</th>
            <th className="num">Columns</th>
            <th>Uploaded</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr key={dataset.id} className={selectedId === dataset.id ? 'row-selected' : undefined}>
              <td className="cell-name">{dataset.filename}</td>
              <td>{formatBytes(dataset.fileSizeBytes)}</td>
              <td>
                <DatasetStatusBadge status={dataset.status} />
              </td>
              <td className="num">{metric(dataset, 'rowCount')}</td>
              <td className="num">{metric(dataset, 'columnCount')}</td>
              <td>{formatDate(dataset.createdAt)}</td>
              <td>
                <button type="button" className="btn btn-link" onClick={() => onView(dataset.id)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
