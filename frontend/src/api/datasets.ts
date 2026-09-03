import type { Dataset } from '../types/dataset';

// Single place that talks to the backend. Components call these functions, never
// fetch directly. Defaults to a same-origin '/api' (works when the backend serves
// the built frontend, and via the Vite dev proxy); override with VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Turn a non-2xx response into an Error, preferring the backend's structured
// { error: { message } } and falling back to a safe, readable message.
async function toError(res: Response, fallback: string): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    const message = body?.error?.message;
    if (typeof message === 'string' && message.length > 0) return new ApiError(message, res.status);
  } catch {
    // response had no/invalid JSON body — fall through to the fallback
  }
  return new ApiError(fallback, res.status);
}

async function request<T>(path: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    // Network/CORS failure — the backend is likely not running.
    throw new ApiError(`${fallback} Is the backend running?`, 0);
  }
  if (!res.ok) throw await toError(res, fallback);
  return (await res.json()) as T;
}

export async function listDatasets(): Promise<Dataset[]> {
  const body = await request<{ data: Dataset[] }>('/datasets', undefined, 'Failed to load datasets.');
  return body.data;
}

export function getDataset(id: string): Promise<Dataset> {
  return request<Dataset>(`/datasets/${id}`, undefined, 'Failed to load dataset.');
}

export async function uploadDataset(file: File): Promise<Dataset> {
  const form = new FormData();
  form.append('file', file);
  const body = await request<{ dataset: Dataset }>('/datasets', { method: 'POST', body: form }, 'Failed to upload dataset.');
  return body.dataset;
}
