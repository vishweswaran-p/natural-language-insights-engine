import { randomUUID } from 'node:crypto';
import { DatasetStatus } from '@app/features/dataset/application/domain/dataset-status';
import type { DatasetQuery } from '@app/features/dataset/application/ports/dataset.query';
import type { Question } from '@app/features/question/application/domain/question';
import type { QuestionCommand } from '@app/features/question/application/ports/question.command';

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

// Records a question against a READY dataset as PROCESSING. Answering it (LLM →
// SQL → execution) happens asynchronously in the worker.
export class AskQuestionUseCase {
  constructor(
    private readonly datasets: DatasetQuery,
    private readonly questions: QuestionCommand,
  ) {}

  async exec(input: AskQuestionInput): Promise<Question> {
    const dataset = await this.datasets.findById(input.datasetId);
    if (!dataset) {
      throw new DatasetNotQueryableError('NOT_FOUND', 'No dataset exists with the given id.');
    }
    if (dataset.status !== DatasetStatus.Ready) {
      throw new DatasetNotQueryableError('NOT_READY', 'The dataset is not ready to be queried yet.');
    }

    return this.questions.create({
      id: randomUUID(),
      datasetId: input.datasetId,
      question: input.question,
    });
  }
}
