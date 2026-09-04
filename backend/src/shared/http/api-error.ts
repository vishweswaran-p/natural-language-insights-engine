import { error } from '@app/shared/http/response';
import type { HttpResponse } from '@app/shared/http/types';

// Client-facing error with HTTP status and stable code.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Map thrown ApiErrors to responses; rethrow everything else to the HTTP bridge.
export async function toResponse(run: () => Promise<HttpResponse>): Promise<HttpResponse> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) return error(err.status, err.code, err.message);
    throw err;
  }
}
