import { useEffect, useState } from 'react';
import { listDatasets } from '../api/datasets';
import { listQuestions } from '../api/questions';
import { AnswerDetails } from '../components/AnswerDetails';
import { QuestionStatusBadge } from '../components/QuestionStatusBadge';
import type { Page } from '../App';
import type { Question } from '../types/question';
import { formatDate } from '../utils/formatDate';

interface Props {
  onNavigate: (page: Page) => void;
}

export function QuestionsHistoryPage({ onNavigate }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  // Map of datasetId -> filename, so each item can show a friendly dataset name.
  const [datasetNames, setDatasetNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // The list endpoint already returns newest-first.
      const [qs, datasets] = await Promise.all([listQuestions(), listDatasets()]);
      setQuestions(qs);
      setDatasetNames(Object.fromEntries(datasets.map((d) => [d.id, d.filename])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Questions</h1>
          <p className="subtitle">Every question asked, most recent first.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => load(true)} disabled={loading || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="panel muted">Loading questions…</div>
      ) : error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="panel empty-state">
          <p>No questions asked yet.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('questions')}>
            Ask a Question
          </button>
        </div>
      ) : (
        <div className="question-list">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              datasetName={datasetNames[question.datasetId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, datasetName }: { question: Question; datasetName?: string }) {
  return (
    <article className="panel question-card">
      <div className="question-card-head">
        <div className="question-card-heading">
          <p className="question-text">“{question.question}”</p>
          <p className="muted question-meta">
            {datasetName ?? 'Unknown dataset'} · {formatDate(question.createdAt)}
          </p>
        </div>
        <QuestionStatusBadge status={question.status} />
      </div>

      {question.status === 'ANSWERED' && question.answer ? (
        <AnswerDetails question={question} />
      ) : question.status === 'REFUSED' ? (
        <div className="banner banner-info">
          {question.refusalReason ?? 'This question cannot be answered from the dataset.'}
        </div>
      ) : question.status === 'FAILED' ? (
        <div className="banner banner-error" role="alert">
          {question.errorMessage ?? 'Something went wrong while answering this question.'}
        </div>
      ) : (
        <div className="answer-loading">
          <span className="spinner spinner-lg" aria-hidden="true" />
          <span>Still answering… refresh to check again.</span>
        </div>
      )}
    </article>
  );
}
