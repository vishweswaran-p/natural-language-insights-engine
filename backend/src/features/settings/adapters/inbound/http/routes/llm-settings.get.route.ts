import { ok, toResponse } from '@app/shared/http';
import type { Ctx, RouteDefinition } from '@app/shared/http';
import { getLlmSettings } from '@app/features/settings/application/llm-settings';

const handler = (_ctx: Ctx) => toResponse(async () => ok(getLlmSettings()));

export const route: RouteDefinition = { method: 'get', path: '/api/settings/llm', handler };
