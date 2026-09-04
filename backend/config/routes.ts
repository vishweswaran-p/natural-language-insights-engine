import { getRoutes as datasetRoutes } from '@app/features/dataset/adapters/inbound/http/routes';
import { getRoutes as healthRoutes } from '@app/features/health/adapters/inbound/http/routes';
import { getRoutes as questionRoutes } from '@app/features/question/adapters/inbound/http/routes';
import { toSailsRoutes } from '@app/shared/http';

const routes = [...healthRoutes(), ...datasetRoutes(), ...questionRoutes()];

export = {
  routes: toSailsRoutes(routes),
};
