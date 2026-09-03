// Health use-case. Trivial today (no I/O, so no ports/outbound adapters), but
// it establishes the shape every feature follows: a use-case class with an
// `exec()` method, constructed via the feature factory and invoked from a thin
// inbound HTTP route.

export interface HealthStatus {
  status: 'ok';
}

export class GetHealthUseCase {
  exec(): HealthStatus {
    return { status: 'ok' };
  }
}
