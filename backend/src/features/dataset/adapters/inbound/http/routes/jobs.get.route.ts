import { ApiError, ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { makeGetJobUseCase } from '@app/features/dataset/adapters/factory';
import { toJobDto } from '@app/features/dataset/adapters/inbound/http/job-dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/jobs/:id — fetch one job (404 if unknown, 400 if malformed id).
const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const id = String(ctx.params.id ?? '');
    if (!UUID_RE.test(id)) {
      throw new ApiError(400, 'INVALID_JOB_ID', 'The job id must be a valid UUID.');
    }

    const job = await makeGetJobUseCase().exec(id);
    if (!job) {
      throw new ApiError(404, 'JOB_NOT_FOUND', 'No job exists with the given id.');
    }

    return ok(toJobDto(job));
  });

export const route: RouteDefinition = { method: 'get', path: '/api/jobs/:id', handler };
