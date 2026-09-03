import type { RouteDefinition } from '@app/shared/http';
import { route as healthGetRoute } from '@app/features/health/adapters/inbound/http/routes/health.get.route';

export function getRoutes(): RouteDefinition[] {
  return [healthGetRoute];
}
