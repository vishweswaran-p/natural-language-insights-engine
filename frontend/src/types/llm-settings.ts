export type LlmProviderName = 'local' | 'openai';

export interface LlmSettings {
  provider: LlmProviderName;
  model: string;
  openaiApiKeyConfigured: boolean;
}
