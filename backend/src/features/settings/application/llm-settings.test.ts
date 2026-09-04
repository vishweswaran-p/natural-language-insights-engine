import { afterEach, describe, expect, it } from 'vitest';
import {
  getLlmSettings,
  OpenAiApiKeyRequiredError,
  updateLlmSettings,
} from './llm-settings';
import { resetLlmRuntimeSettings } from '@app/shared/runtime/llm-runtime-settings';

describe('llm-settings', () => {
  const originalProvider = process.env.LLM_PROVIDER;
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.LLM_PROVIDER = originalProvider;
    process.env.OPENAI_API_KEY = originalKey;
    resetLlmRuntimeSettings();
  });

  it('returns env defaults when no runtime override is set', () => {
    process.env.LLM_PROVIDER = 'local';
    const settings = getLlmSettings();
    expect(settings.provider).toBe('local');
    expect(settings.model).toBe('qwen2.5-coder:1.5b');
  });

  it('requires an API key when switching to OpenAI without one configured', () => {
    process.env.OPENAI_API_KEY = '';
    expect(() => updateLlmSettings({ provider: 'openai' })).toThrow(OpenAiApiKeyRequiredError);
  });

  it('stores a runtime API key and switches provider to OpenAI', () => {
    process.env.OPENAI_API_KEY = '';
    const settings = updateLlmSettings({ provider: 'openai', openaiApiKey: 'sk-test' });
    expect(settings.provider).toBe('openai');
    expect(settings.openaiApiKeyConfigured).toBe(true);
    expect(settings.model).toBe('gpt-4o-mini');
  });

  it('can switch back to local without losing a stored OpenAI key', () => {
    updateLlmSettings({ provider: 'openai', openaiApiKey: 'sk-test' });
    const local = updateLlmSettings({ provider: 'local' });
    expect(local.provider).toBe('local');

    const openaiAgain = updateLlmSettings({ provider: 'openai' });
    expect(openaiAgain.provider).toBe('openai');
    expect(openaiAgain.openaiApiKeyConfigured).toBe(true);
  });
});
