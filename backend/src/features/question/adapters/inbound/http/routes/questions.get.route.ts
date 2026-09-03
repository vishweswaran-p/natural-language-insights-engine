import { ApiError, ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { makeGetQuestionUseCase } from '@app/features/question/adapters/factory';
import { toQuestionDto } from '@app/features/question/adapters/inbound/http/question-dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/questions/:id — fetch one question (404 if unknown, 400 if malformed id).
const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const id = String(ctx.params.id ?? '');
    if (!UUID_RE.test(id)) {
      throw new ApiError(400, 'INVALID_QUESTION_ID', 'The question id must be a valid UUID.');
    }

    const question = await makeGetQuestionUseCase().exec(id);
    if (!question) {
      throw new ApiError(404, 'QUESTION_NOT_FOUND', 'No question exists with the given id.');
    }

    return ok(toQuestionDto(question));
  });

export const route: RouteDefinition = { method: 'get', path: '/api/questions/:id', handler };
