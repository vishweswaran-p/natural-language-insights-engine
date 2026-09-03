import type { Ctx, PlatformRequest, RouteDefinition } from '@app/shared/http/types';

/** Minimal `res` contract this bridge uses (Sails/Express are compatible). */
type SailsResponseLike = {
  set: (key: string, value: string) => void;
  status: (status: number) => { json: (body: unknown) => unknown };
};

type SailsHandler = (req: PlatformRequest, res: SailsResponseLike) => Promise<unknown> | unknown;

function toSailsHandler(handler: RouteDefinition['handler']): SailsHandler {
  return async (req, res) => {
    try {
      const ctx: Ctx = { req, params: req.allParams() };
      const { status, body, headers } = await handler(ctx);
      if (headers) {
        for (const [key, value] of Object.entries(headers)) res.set(key, value);
      }
      return res.status(status).json(body);
    } catch (err) {
      // Single error boundary for unexpected failures. Known client errors are
      // returned by handlers themselves; anything reaching here is a 500. Internal
      // details are logged server-side and never sent to the client.
      // eslint-disable-next-line no-console
      console.error('Unhandled error in route handler', err);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } });
    }
  };
}

/**
 * Adapt feature route definitions into a Sails routes map
 * (`{ 'GET /path': handler }`). Throws on duplicate method+path.
 */
export function toSailsRoutes(routes: readonly RouteDefinition[]): Record<string, SailsHandler> {
  const map: Record<string, SailsHandler> = {};
  for (const route of routes) {
    const key = `${route.method.toUpperCase()} ${route.path}`;
    if (map[key]) throw new Error(`Route already registered: ${key}`);
    map[key] = toSailsHandler(route.handler);
  }
  return map;
}
