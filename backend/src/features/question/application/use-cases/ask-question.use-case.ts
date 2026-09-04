import { randomUUID } from 'node:crypto';
import { DatasetStatus } from '@app/features/dataset/application/domain/dataset-status';
import type { Job } from '@app/features/dataset/application/domain/job';
import { JobType } from '@app/features/dataset/application/domain/job';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';
import type { JobQueue } from '@app/features/dataset/application/ports/job-queue';
import type { Question } from '@app/features/question/application/domain/question';
import type { QuestionCommand } from '@app/features/question/application/ports/question.command';
import { getLogger } from '@app/shared/logging';

const log = getLogger('ask-question');

// Raised when a question is asked against a dataset that cannot be queried.
// The HTTP layer maps `reason` to a status code; the application stays free of
// HTTP concerns.
export class DatasetNotQueryableError extends Error {
  constructor(
    readonly reason: 'NOT_FOUND' | 'NOT_READY',
    message: string,
  ) {
    super(message);
    this.name = 'DatasetNotQueryableError';
  }
}

export interface AskQuestionInput {
  datasetId: string;
  question: string;
}

export interface AskQuestionResult {
  question: Question;
  job: Job;
}

// Records a question against a READY dataset as PROCESSING and enqueues a QUERY
// job. Answering it (LLM → SQL → execution → summary) happens asynchronously in
// the worker, reusing the same queue/worker as ingestion.
export class AskQuestionUseCase {
  constructor(
    private readonly datasets: DatasetQuery,
    private readonly questions: QuestionCommand,
    private readonly jobQueue: JobQueue,
  ) {}

  async exec(input: AskQuestionInput): Promise<AskQuestionResult> {
    const dataset = await this.datasets.findById(input.datasetId);
    if (!dataset) {
      throw new DatasetNotQueryableError('NOT_FOUND', 'No dataset exists with the given id.');
    }
    if (dataset.status !== DatasetStatus.Ready) {
      throw new DatasetNotQueryableError('NOT_READY', 'The dataset is not ready to be queried yet.');
    }

    const question = await this.questions.create({
      id: randomUUID(),
      datasetId: input.datasetId,
      question: input.question,
    });

    // Create + enqueue are not one transaction (that would couple two adapters).
    // Compensate instead: if enqueue fails, mark the question FAILED so it is
    // never left stuck in PROCESSING.
    try {
      const job = await this.jobQueue.enqueue({
        type: JobType.Query,
        datasetId: input.datasetId,
        payload: { questionId: question.id },
      });
      log.info('Question accepted; QUERY job enqueued', {
        questionId: question.id,
        jobId: job.id,
        datasetId: input.datasetId,
        question: input.question,
      });
      return { question, job };
    } catch (err) {
      await this.questions.markFailed(question.id, 'Failed to enqueue query job.').catch((markErr) => {
        log.error('Failed to mark question FAILED after enqueue error', { questionId: question.id, err: markErr });
      });
      throw err;
    }
  }
}
