import { GetHealthUseCase } from '@app/features/health/application/use-cases/get-health.use-case';

export function makeGetHealthUseCase() {
  return new GetHealthUseCase();
}
