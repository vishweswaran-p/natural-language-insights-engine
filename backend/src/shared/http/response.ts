import type { Headers, HttpResponse } from '@app/shared/http/types';

export function ok<T>(body: T, headers?: Headers): HttpResponse<T> {
  return { status: 200, body, headers };
}

export function withStatus<T>(status: number, body: T, headers?: Headers): HttpResponse<T> {
  return { status, body, headers };
}

// Consistent structured error body: { error: { code, message } }.
export type ErrorBody = { error: { code: string; message: string } };

export function error(status: number, code: string, message: string): HttpResponse<ErrorBody> {
  return { status, body: { error: { code, message } } };
}
