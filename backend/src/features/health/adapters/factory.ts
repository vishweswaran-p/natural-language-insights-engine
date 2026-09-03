import { GetHealthUseCase } from '@app/features/health/application/use-cases/get-health.use-case';

// Feature factory: the single place where a use-case is assembled from its
// (concrete) dependencies. Health has no outbound ports/adapters yet, so this
// is pure construction. When a use-case needs I/O, its outbound adapters are
// `new`ed here and injected — never in routes or application code.

export function makeGetHealthUseCase() {
  return new GetHealthUseCase();
}
