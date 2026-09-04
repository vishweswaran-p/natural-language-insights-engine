import { useState } from 'react';
import { AnswerDetails } from './AnswerDetails';
import { QuestionProvenance } from './QuestionProvenance';
import { QuestionStatusBadge } from './QuestionStatusBadge';
import { useQuestionResult } from '../hooks/useQuestionResult';
import type { Question } from '../types/question';
import { formatDate } from '../utils/formatDate';

interface Props {
  question: Question;
  datasetName?: string;
  defaultOpen?: boolean;
}

export function QuestionCard({ question: initial, datasetName, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { question: polled } = useQuestionResult(initial.status === 'PROCESSING' ? initial.id : null);
  const question = polled ?? initial;

  return (
    <article className="panel question-card">
      <div
        className="question-card-head"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <div
          className="question-card-heading"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <p className="question-text">"{question.question}"</p>
          <p className="muted question-meta">
            {datasetName ?? 'Unknown dataset'} · {formatDate(question.createdAt)}
          </p>
        </div>
        <div className="question-card-head-right">
          <QuestionStatusBadge status={question.status} />
          <span className={`chevron${open ? ' chevron-open' : ''}`} aria-hidden="true" />
        </div>
      </div>

      {open && (
        <div className="question-card-body">
          {question.status === 'ANSWERED' && question.answer ? (
            <AnswerDetails question={question} />
          ) : question.status === 'REFUSED' ? (
            <div className="question-outcome">
              <div className="banner banner-info">
                {question.refusalReason ?? 'This question cannot be answered from the dataset.'}
              </div>
              <QuestionProvenance question={question} />
            </div>
          ) : question.status === 'FAILED' ? (
            <div className="question-outcome">
              <div className="banner banner-error" role="alert">
                {question.errorMessage ?? 'Something went wrong while answering this question.'}
              </div>
              <QuestionProvenance question={question} />
            </div>
          ) : (
            <div className="answer-loading">
              <span className="spinner spinner-lg" aria-hidden="true" />
              <span>Answering your question…</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
