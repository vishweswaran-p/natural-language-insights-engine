import { useCallback, useEffect, useState } from 'react';
import { askQuestion, listQuestions } from '../api/questions';
import { listDatasets } from '../api/datasets';
import { QuestionCard } from '../components/QuestionCard';
import { RefreshIcon } from '../components/icons';
import type { Page } from '../App';
import type { Dataset } from '../types/dataset';
import type { Question } from '../types/question';

interface Props {
  onNavigate: (page: Page) => void;
}

const MAX_QUESTION_LENGTH = 2000;
const PAGE_SIZE = 5;

function optionLabel(dataset: Dataset): string {
  if (dataset.metadata) {
    return `${dataset.filename} · ${dataset.metadata.dataset.rowCount.toLocaleString('en-US')} rows`;
  }
  return dataset.filename;
}

export function AskQuestionPage({ onNavigate }: Props) {
  const [readyDatasets, setReadyDatasets] = useState<Dataset[]>([]);
  const [datasetNames, setDatasetNames] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const [page, setPage] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [datasets, qs] = await Promise.all([listDatasets(), listQuestions()]);
      const ready = datasets.filter((d) => d.status === 'READY');
      setReadyDatasets(ready);
      setDatasetNames(Object.fromEntries(datasets.map((d) => [d.id, d.filename])));
      setQuestions(qs);
      if (ready.length > 0) {
        setSelectedDatasetId((current) => current || ready[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageQuestions = questions.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const canSubmit = !submitting && selectedDatasetId !== '' && questionText.trim().length > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { question: created } = await askQuestion(selectedDatasetId, questionText.trim());
      setQuestions((prev) => [created, ...prev.filter((q) => q.id !== created.id)]);
      setExpandedQuestionId(created.id);
      setPage(0);
      setQuestionText('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit the question.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Ask a Question</h1>
      <p className="subtitle">Select a ready dataset, ask a question, and view answers below.</p>

      {loading ? (
        <div className="panel muted">Loading…</div>
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
        <>
          <form className="panel" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="dataset-select">Dataset</label>
              <select
                id="dataset-select"
                value={selectedDatasetId}
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                disabled={submitting}
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
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="ask-actions">
              <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Submitting…
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

          <section className="questions-section">
            <div className="page-head">
              <div>
                <h2 className="section-title">Your questions</h2>
                <p className="muted section-lead">Most recent first — expand a row to see the answer.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => load(true)}
                disabled={refreshing}
              >
                <RefreshIcon className={`btn-icon${refreshing ? ' btn-icon--spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="panel muted">No questions yet. Ask one above to get started.</div>
            ) : (
              <>
                <div className="question-list">
                  {pageQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      datasetName={datasetNames[question.datasetId]}
                      defaultOpen={question.id === expandedQuestionId}
                    />
                  ))}
                </div>

                {questions.length > PAGE_SIZE && (
                  <nav className="pagination" aria-label="Question pages">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {safePage + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
