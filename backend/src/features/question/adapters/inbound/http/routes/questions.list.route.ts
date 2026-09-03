import { ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { makeListQuestionsUseCase } from '@app/features/question/adapters/factory';
import { toQuestionDto } from '@app/features/question/adapters/inbound/http/question-dto';

// GET /api/questions — list questions with their answers, newest first.
const handler = (_ctx: Ctx) =>
  toResponse(async () => {
    const questions = await makeListQuestionsUseCase().exec();
    return ok({ data: questions.map(toQuestionDto) });
  });

export const route: RouteDefinition = { method: 'get', path: '/api/questions', handler };
