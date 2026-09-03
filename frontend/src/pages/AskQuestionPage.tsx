import { useEffect, useState } from 'react';
import { listDatasets } from '../api/datasets';
import type { Page } from '../App';
import type { Dataset } from '../types/dataset';

interface Props {
  onNavigate: (page: Page) => void;
}

function optionLabel(dataset: Dataset): string {
  if (dataset.metadata) {
    return `${dataset.filename} · ${dataset.metadata.dataset.rowCount.toLocaleString('en-US')} rows`;
  }
  return dataset.filename;
}

export function AskQuestionPage({ onNavigate }: Props) {
  const [readyDatasets, setReadyDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [question, setQuestion] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ready = (await listDatasets()).filter((dataset) => dataset.status === 'READY');
        if (!active) return;
        setReadyDatasets(ready);
        if (ready.length > 0) setSelectedDatasetId(ready[0].id);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load datasets.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h1>Ask a Question</h1>
      <p className="subtitle">Select a ready dataset and ask a question about it.</p>

      {loading ? (
        <div className="panel muted">Loading datasets…</div>
      ) : error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : readyDatasets.length === 0 ? (
        <div className="panel empty-state">
          <p>No ready datasets available.</p>
          <p className="muted">Upload a dataset and wait for profiling to complete before asking questions.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('datasets')}>
            Go to Datasets
          </button>
        </div>
      ) : (
        <div className="panel">
          <div className="field">
            <label htmlFor="dataset-select">Dataset</label>
            <select
              id="dataset-select"
              value={selectedDatasetId}
              onChange={(event) => setSelectedDatasetId(event.target.value)}
            >
              {readyDatasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {optionLabel(dataset)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              rows={4}
              placeholder="What were the top 10 products by revenue?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>

          <div className="ask-actions">
            {/* Intentionally disabled: the query service is not connected yet. */}
            <button type="button" className="btn btn-primary" disabled>
              Ask Question
            </button>
            <span className="muted helper">
              Question answering will be enabled once the query service is connected.
            </span>
          </div>
        </div>
      )}

      <section className="panel answer-panel">
        <h3>Answer</h3>
        <p className="muted">Your answer will appear here once question answering is connected.</p>
      </section>
    </div>
  );
}
