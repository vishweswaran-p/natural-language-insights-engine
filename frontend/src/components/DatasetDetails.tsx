import type { Dataset } from '../types/dataset';
import type { ColumnMetadata, ColumnStats, DatasetMetadata, Primitive } from '../types/dataset-metadata';
import { formatBytes } from '../utils/formatBytes';
import { formatDate } from '../utils/formatDate';
import { DatasetStatusBadge } from './DatasetStatusBadge';

const MAX_SAMPLE_VALUES = 3;
const MAX_SAMPLE_LENGTH = 32;

interface Props {
  dataset: Dataset;
  onClose: () => void;
}

export function DatasetDetails({ dataset, onClose }: Props) {
  return (
    <section className="panel details-panel">
      <div className="details-header">
        <h3>Dataset Details</h3>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="detail-grid">
        <Detail label="Filename" value={dataset.filename} />
        <div className="detail">
          <dt>Status</dt>
          <dd>
            <DatasetStatusBadge status={dataset.status} />
          </dd>
        </div>
        <Detail label="File size" value={formatBytes(dataset.fileSizeBytes)} />
        <Detail label="MIME type" value={dataset.mimeType} />
        <Detail label="Created at" value={formatDate(dataset.createdAt)} />
        <Detail label="Updated at" value={formatDate(dataset.updatedAt)} />
      </dl>

      {dataset.status === 'PROCESSING' && (
        <div className="banner banner-info">
          Dataset profiling is still in progress. Refresh the dataset list to check again.
        </div>
      )}

      {dataset.status === 'FAILED' && (
        <div className="banner banner-error">{dataset.errorMessage ?? 'Dataset profiling failed.'}</div>
      )}

      {dataset.status === 'READY' && dataset.metadata && <ReadyDetails metadata={dataset.metadata} />}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ReadyDetails({ metadata }: { metadata: DatasetMetadata }) {
  return (
    <>
      <div className="overview-grid">
        <Overview label="Rows" value={metadata.dataset.rowCount.toLocaleString('en-US')} />
        <Overview label="Columns" value={metadata.dataset.columnCount.toLocaleString('en-US')} />
        <Overview label="Mode" value={metadata.profiling.statisticsMode === 'full' ? 'Full' : 'Sampled'} />
        <Overview label="Profiled" value={formatDate(metadata.profiling.generatedAt)} />
      </div>

      <h4 className="section-title">Columns</h4>
      <div className="table-wrap">
        <table className="table columns-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th className="num">Null %</th>
              <th className="num">Distinct</th>
              <th>Sample values</th>
            </tr>
          </thead>
          <tbody>
            {metadata.columns.map((column) => (
              <ColumnRow key={column.name} column={column} />
            ))}
          </tbody>
        </table>
      </div>

      {metadata.warnings.length > 0 && (
        <>
          <h4 className="section-title">Profiling Warnings</h4>
          <ul className="warnings">
            {metadata.warnings.map((warning, index) => (
              <li key={index} className="warning-item">
                {warning.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Overview({ label, value }: { label: string; value: string }) {
  return (
    <div className="overview-item">
      <span className="overview-label">{label}</span>
      <span className="overview-value">{value}</span>
    </div>
  );
}

function ColumnRow({ column }: { column: ColumnMetadata }) {
  const samples = column.sampleValues.slice(0, MAX_SAMPLE_VALUES).map(formatPrimitive).join(', ');
  const distinct = column.distinctCount != null ? column.distinctCount.toLocaleString('en-US') : '—';
  const numeric = (column.type === 'integer' || column.type === 'decimal') && column.stats
    ? numericSummary(column.stats)
    : '';

  return (
    <tr>
      <td className="cell-name">{column.name}</td>
      <td>
        <span className="type-tag">{column.type}</span>
      </td>
      <td className="num">{formatPercent(column.nullPercentage)}</td>
      <td className="num">{distinct}</td>
      <td>
        <span className="samples" title={column.sampleValues.map(String).join(', ')}>
          {samples || '—'}
        </span>
        {numeric && <span className="stats-secondary">{numeric}</span>}
      </td>
    </tr>
  );
}

function numericSummary(stats: ColumnStats): string {
  const parts: string[] = [];
  if (stats.min != null) parts.push(`min ${formatPrimitive(stats.min)}`);
  if (stats.max != null) parts.push(`max ${formatPrimitive(stats.max)}`);
  if (stats.avg != null) parts.push(`avg ${roundNumber(stats.avg)}`);
  if (stats.median != null) parts.push(`median ${roundNumber(stats.median)}`);
  return parts.join(' · ');
}

function formatPrimitive(value: Primitive): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  const text = String(value);
  return text.length > MAX_SAMPLE_LENGTH ? `${text.slice(0, MAX_SAMPLE_LENGTH)}…` : text;
}

function roundNumber(value: number): string {
  return Number(value.toFixed(2)).toLocaleString('en-US');
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
