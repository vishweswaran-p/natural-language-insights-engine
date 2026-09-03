import { ok } from '../../../../../../shared/http';
import type { Ctx, RouteDefinition } from '../../../../../../shared/http';
import { makeGetDatasetUseCase } from '../../../factory';
import { ApiError, toResponse } from '../api-error';
import { toDatasetDto } from '../dataset-dto';

// RFC 4122 UUID. We validate before querying so a malformed id is a clean 400
// rather than a PostgreSQL "invalid input syntax for type uuid" error.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/datasets/:id — fetch one dataset (404 if unknown, 400 if malformed id).
const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const id = String(ctx.params.id ?? '');
    if (!UUID_RE.test(id)) {
      throw new ApiError(400, 'INVALID_DATASET_ID', 'The dataset id must be a valid UUID.');
    }

    const dataset = await makeGetDatasetUseCase().exec(id);
    if (!dataset) {
      throw new ApiError(404, 'DATASET_NOT_FOUND', 'No dataset exists with the given id.');
    }

    return ok(toDatasetDto(dataset));
  });

export const route: RouteDefinition = { method: 'get', path: '/api/datasets/:id', handler };
