import { ApiError, toResponse, withStatus } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { DatasetNotQueryableError } from '@app/features/question/application/use-cases/ask-question.use-case';
import { makeAskQuestionUseCase } from '@app/features/question/adapters/factory';
import { toQuestionDto } from '@app/features/question/adapters/inbound/http/question-dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION_LENGTH = 2000;

// POST /api/questions — ask a question about a dataset. Records it as PROCESSING
// and returns immediately; the answer is produced asynchronously.
const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const datasetId = String(ctx.params.datasetId ?? '');
    const question = String(ctx.params.question ?? '').trim();

    if (!UUID_RE.test(datasetId)) {
      throw new ApiError(400, 'INVALID_DATASET_ID', 'A valid dataset id (UUID) is required.');
    }
    if (question.length === 0) {
      throw new ApiError(400, 'QUESTION_REQUIRED', 'A non-empty question is required.');
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      throw new ApiError(400, 'QUESTION_TOO_LONG', `The question must be ${MAX_QUESTION_LENGTH} characters or fewer.`);
    }

    try {
      const created = await makeAskQuestionUseCase().exec({ datasetId, question });
      return withStatus(202, { question: toQuestionDto(created) });
    } catch (err) {
      if (err instanceof DatasetNotQueryableError) {
        const status = err.reason === 'NOT_FOUND' ? 404 : 409;
        throw new ApiError(status, `DATASET_${err.reason}`, err.message);
      }
      throw err;
    }
  });

export const route: RouteDefinition = { method: 'post', path: '/api/questions', handler };
