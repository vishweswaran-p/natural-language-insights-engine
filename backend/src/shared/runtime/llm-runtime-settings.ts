import type { LlmProviderName } from '@app/features/question/adapters/outbound/llm/llm-config';

// In-memory runtime overrides for LLM provider selection. Lets the UI switch
// between Ollama and OpenAI without restarting Docker. Falls back to env vars
// when a field is not overridden. Cleared on process restart.

export type LlmRuntimeSettings = {
  provider: LlmProviderName;
  openaiApiKey?: string;
};

type RuntimeStore = {
  provider?: LlmProviderName;
  openaiApiKey?: string;
};

let runtime: RuntimeStore = {};

export function getLlmRuntimeSettings(): LlmRuntimeSettings | null {
  return runtime.provider ? { provider: runtime.provider, openaiApiKey: runtime.openaiApiKey } : null;
}

export function setLlmRuntimeSettings(settings: Partial<LlmRuntimeSettings> & { provider: LlmProviderName }): void {
  runtime = { ...runtime, ...settings };
}

export function resetLlmRuntimeSettings(): void {
  runtime = {};
}

export function resolveOpenAiApiKey(): string {
  return runtime.openaiApiKey ?? process.env.OPENAI_API_KEY ?? '';
}
