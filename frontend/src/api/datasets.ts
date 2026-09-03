import type { Dataset } from '../types/dataset';
import { request } from './client';

// Dataset endpoints. HTTP/error plumbing lives in ./client.

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
