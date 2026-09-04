import { resolveLlmConfig, type LlmProviderName } from '@app/features/question/adapters/outbound/llm/llm-config';
import {
  resolveOpenAiApiKey,
  setLlmRuntimeSettings,
} from '@app/shared/runtime/llm-runtime-settings';

export type LlmSettings = {
  provider: LlmProviderName;
  model: string;
  openaiApiKeyConfigured: boolean;
};

export function getLlmSettings(): LlmSettings {
  const config = resolveLlmConfig();
  return {
    provider: config.provider,
    model: config.model,
    openaiApiKeyConfigured: config.provider === 'openai' ? config.apiKey.length > 0 : true,
  };
}

export class OpenAiApiKeyRequiredError extends Error {
  constructor() {
    super('An OpenAI API key is required when using the OpenAI provider.');
    this.name = 'OpenAiApiKeyRequiredError';
  }
}

export function updateLlmSettings(input: {
  provider: LlmProviderName;
  openaiApiKey?: string;
}): LlmSettings {
  if (input.provider === 'local') {
    setLlmRuntimeSettings({ provider: 'local' });
    return getLlmSettings();
  }

  const trimmedKey = input.openaiApiKey?.trim();
  const existingKey = resolveOpenAiApiKey();
  const apiKey = trimmedKey || existingKey;
  if (!apiKey) throw new OpenAiApiKeyRequiredError();

  setLlmRuntimeSettings({
    provider: 'openai',
    ...(trimmedKey ? { openaiApiKey: trimmedKey } : {}),
  });

  return getLlmSettings();
}

// Exposed for tests and diagnostics without returning the key itself.
export function isOpenAiApiKeyConfigured(): boolean {
  return resolveOpenAiApiKey().length > 0;
}
