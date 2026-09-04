import { request } from './client';
import type { LlmSettings, LlmProviderName } from '../types/llm-settings';

export function getLlmSettings(): Promise<LlmSettings> {
  return request<LlmSettings>('/settings/llm', undefined, 'Failed to load LLM settings.');
}

export function updateLlmSettings(input: {
  provider: LlmProviderName;
  openaiApiKey?: string;
}): Promise<LlmSettings> {
  return request<LlmSettings>(
    '/settings/llm',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update LLM settings.',
  );
}
