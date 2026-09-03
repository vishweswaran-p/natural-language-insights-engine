import { useEffect, useState } from 'react';
import { askQuestion } from '../api/questions';
import { listDatasets } from '../api/datasets';
import { QuestionAnswer } from '../components/QuestionAnswer';
import { useQuestionResult } from '../hooks/useQuestionResult';
import type { Page } from '../App';
import type { Dataset } from '../types/dataset';

interface Props {
  onNavigate: (page: Page) => void;
}

const MAX_QUESTION_LENGTH = 2000;

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The id of the question currently being answered; drives the polling hook.
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const { question: result, error: pollError } = useQuestionResult(activeQuestionId);

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

  // Disable submission while a question is in flight (submitting or still
  // processing), or when the form is incomplete.
  const answering = submitting || result?.status === 'PROCESSING';
  const canSubmit = !answering && selectedDatasetId !== '' && question.trim().length > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    setActiveQuestionId(null); // clear any previous answer while the new one starts
    try {
      const { question: created } = await askQuestion(selectedDatasetId, question.trim());
      setActiveQuestionId(created.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit the question.');
    } finally {
      setSubmitting(false);
    }
  }

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
        <form className="panel" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="dataset-select">Dataset</label>
            <select
              id="dataset-select"
              value={selectedDatasetId}
              onChange={(event) => setSelectedDatasetId(event.target.value)}
              disabled={answering}
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
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="What were the top 10 products by revenue?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={answering}
            />
          </div>

          <div className="ask-actions">
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {answering ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Answering…
                </>
              ) : (
                'Ask Question'
              )}
            </button>
            {submitError && (
              <span className="banner banner-error" role="alert">
                {submitError}
              </span>
            )}
          </div>
        </form>
      )}

      {(submitting || activeQuestionId) && (
        <QuestionAnswer submitting={submitting} question={result} error={pollError} />
      )}
    </div>
  );
}
