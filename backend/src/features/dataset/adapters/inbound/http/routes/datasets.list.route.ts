import { ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { makeListDatasetsUseCase } from '@app/features/dataset/adapters/factory';
import { toDatasetDto } from '@app/features/dataset/adapters/inbound/http/dataset-dto';

// GET /api/datasets — list datasets, newest first, wrapped in { data: [...] }.
const handler = (_ctx: Ctx) =>
  toResponse(async () => {
    const datasets = await makeListDatasetsUseCase().exec();
    return ok({ data: datasets.map(toDatasetDto) });
  });

export const route: RouteDefinition = { method: 'get', path: '/api/datasets', handler };
