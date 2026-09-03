// Framework-agnostic HTTP types. Route handlers return a plain HttpResponse;
// the Sails bridge is the only thing that knows about Sails.

export type Headers = Record<string, string>;

export type HttpResponse<T = unknown> = {
  status: number;
  body?: T;
  headers?: Headers;
};

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Minimal structural view of the incoming request the platform relies on.
 * Any Express/Sails request satisfying this shape works.
 */
export type PlatformRequest = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  allParams: () => Record<string, unknown>;
};

/** Per-request context passed to handlers (seeded by the bridge). */
export type Ctx = {
  req: PlatformRequest;
  params: Record<string, unknown>;
};

export type Handler = (ctx: Ctx) => Promise<HttpResponse> | HttpResponse;

/** A route as an inbound-adapter value: method + path + handler. */
export type RouteDefinition = {
  method: HTTPMethod;
  path: string;
  handler: Handler;
};
