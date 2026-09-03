import type { RouteDefinition } from '../../../../../../shared/http';
import { route as healthGetRoute } from './health.get.route';

export function getRoutes(): RouteDefinition[] {
  return [healthGetRoute];
}
