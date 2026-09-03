import type { RouteDefinition } from '@app/shared/http';
import { route as datasetsGetRoute } from '@app/features/dataset/adapters/inbound/http/routes/datasets.get.route';
import { route as datasetsListRoute } from '@app/features/dataset/adapters/inbound/http/routes/datasets.list.route';
import { route as datasetsPostRoute } from '@app/features/dataset/adapters/inbound/http/routes/datasets.post.route';
import { route as jobsGetRoute } from '@app/features/dataset/adapters/inbound/http/routes/jobs.get.route';

export function getRoutes(): RouteDefinition[] {
  return [datasetsPostRoute, datasetsListRoute, datasetsGetRoute, jobsGetRoute];
}
