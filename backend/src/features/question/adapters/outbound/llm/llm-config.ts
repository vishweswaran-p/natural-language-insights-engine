// Resolves the active LLM configuration from the environment. `LLM_PROVIDER`
// selects the preset; both presets are OpenAI-compatible (OpenAI hosted, or
// Ollama locally), so a single adapter serves both. Switching providers is
// entirely an env change — the question layer is unaffected.

export type LlmProviderName = 'openai' | 'local';

export interface TokenPricing {
  promptPer1k: number;
  completionPer1k: number;
}

export interface LlmConfig {
  provider: LlmProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  // Per-1K-token pricing for cost estimation; null when unknown.
  pricing: TokenPricing | null;
}

// USD per 1K tokens. Extend as models are added; unknown models fall back to
// null (cost is simply not estimated).
const OPENAI_PRICING: Record<string, TokenPricing> = {
  'gpt-4o-mini': { promptPer1k: 0.00015, completionPer1k: 0.0006 },
  'gpt-4o': { promptPer1k: 0.0025, completionPer1k: 0.01 },
};

export function resolveLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER ?? 'local') as LlmProviderName;

  if (provider === 'openai') {
    // A missing key is not fatal at boot — the app (and dataset ingestion) still
    // start. The adapter checks for it at call time so only question-answering
    // fails, with a clear message, when the key is absent.
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    return {
      provider,
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model,
      pricing: OPENAI_PRICING[model] ?? null,
    };
  }

  if (provider === 'local') {
    return {
      provider,
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
      apiKey: 'ollama', // Ollama ignores the key but the OpenAI client shape expects one.
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:7b',
      pricing: { promptPer1k: 0, completionPer1k: 0 }, // self-hosted: no per-token cost
    };
  }

  throw new Error(`Unknown LLM_PROVIDER '${provider}' (expected 'openai' or 'local').`);
}
