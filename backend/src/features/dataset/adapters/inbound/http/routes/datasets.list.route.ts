import { ok } from '../../../../../../shared/http';
import type { Ctx, RouteDefinition } from '../../../../../../shared/http';
import { makeListDatasetsUseCase } from '../../../factory';
import { toResponse } from '../api-error';
import { toDatasetDto } from '../dataset-dto';

// GET /api/datasets — list datasets, newest first, wrapped in { data: [...] }.
const handler = (_ctx: Ctx) =>
  toResponse(async () => {
    const datasets = await makeListDatasetsUseCase().exec();
    return ok({ data: datasets.map(toDatasetDto) });
  });

export const route: RouteDefinition = { method: 'get', path: '/api/datasets', handler };
