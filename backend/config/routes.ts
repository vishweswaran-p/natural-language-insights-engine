import { getRoutes as datasetRoutes } from '@app/features/dataset/adapters/inbound/http/routes';
import { getRoutes as healthRoutes } from '@app/features/health/adapters/inbound/http/routes';
import { getRoutes as questionRoutes } from '@app/features/question/adapters/inbound/http/routes';
import { toSailsRoutes } from '@app/shared/http';

// HTTP composition root. Each feature owns its routes (exported via getRoutes);
// here we gather them and adapt them to Sails. Sails is only the runtime — there
// are no per-feature Sails controllers or hand-written route mappings.
const routes = [...healthRoutes(), ...datasetRoutes(), ...questionRoutes()];

export = {
  routes: toSailsRoutes(routes),
};
