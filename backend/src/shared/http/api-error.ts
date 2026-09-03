import { error } from '@app/shared/http/response';
import type { HttpResponse } from '@app/shared/http/types';

// A client-facing error with an HTTP status and a stable machine-readable code.
// Handlers throw these; `toResponse` maps them to structured error responses.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Wrap a handler body so thrown ApiErrors become structured responses and any
// other error propagates to the shared bridge (→ 500 INTERNAL_ERROR).
export async function toResponse(run: () => Promise<HttpResponse>): Promise<HttpResponse> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) return error(err.status, err.code, err.message);
    throw err;
  }
}
