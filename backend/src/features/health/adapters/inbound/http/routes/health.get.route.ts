import { ok } from '../../../../../../shared/http';
import type { Ctx, RouteDefinition } from '../../../../../../shared/http';
import type { HealthStatus } from '../../../../application/use-cases/get-health.use-case';
import { makeGetHealthUseCase } from '../../../factory';

// Thin inbound HTTP adapter: build the use-case via the factory, run it, and
// map the result to the HTTP response. No business logic here.
const handler = (_ctx: Ctx) => {
  const result = makeGetHealthUseCase().exec();
  return ok(toOutput(result));
};

export const route: RouteDefinition = { method: 'get', path: '/health', handler };

// Explicit response mapping (no spreads) keeps the HTTP contract visible.
function toOutput(result: HealthStatus): { status: 'ok' } {
  return { status: result.status };
}
