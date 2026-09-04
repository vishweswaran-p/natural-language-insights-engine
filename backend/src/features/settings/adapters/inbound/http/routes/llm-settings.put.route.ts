import { ApiError, ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import type { LlmProviderName } from '@app/features/question/adapters/outbound/llm/llm-config';
import {
  OpenAiApiKeyRequiredError,
  updateLlmSettings,
} from '@app/features/settings/application/llm-settings';

const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const provider = String(ctx.params.provider ?? '').trim() as LlmProviderName;
    if (provider !== 'local' && provider !== 'openai') {
      throw new ApiError(400, 'INVALID_PROVIDER', "Provider must be 'local' or 'openai'.");
    }

    const openaiApiKey =
      typeof ctx.params.openaiApiKey === 'string' ? ctx.params.openaiApiKey : undefined;

    try {
      return ok(updateLlmSettings({ provider, openaiApiKey }));
    } catch (err) {
      if (err instanceof OpenAiApiKeyRequiredError) {
        throw new ApiError(400, 'OPENAI_API_KEY_REQUIRED', err.message);
      }
      throw err;
    }
  });

export const route: RouteDefinition = { method: 'put', path: '/api/settings/llm', handler };
