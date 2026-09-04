import { ok } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import type { HealthStatus } from '@app/features/health/application/use-cases/get-health.use-case';
import { makeGetHealthUseCase } from '@app/features/health/adapters/factory';

const handler = (_ctx: Ctx) => {
  const result = makeGetHealthUseCase().exec();
  return ok(toOutput(result));
};

export const route: RouteDefinition = { method: 'get', path: '/health', handler };

function toOutput(result: HealthStatus): { status: 'ok' } {
  return { status: result.status };
}
