import type { RouteDefinition } from '../../../../../../shared/http';
import { route as datasetsGetRoute } from './datasets.get.route';
import { route as datasetsListRoute } from './datasets.list.route';
import { route as datasetsPostRoute } from './datasets.post.route';
import { route as jobsGetRoute } from './jobs.get.route';

export function getRoutes(): RouteDefinition[] {
  return [datasetsPostRoute, datasetsListRoute, datasetsGetRoute, jobsGetRoute];
}
