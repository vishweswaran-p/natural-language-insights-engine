import type { RouteDefinition } from '@app/shared/http';
import { route as llmSettingsGetRoute } from '@app/features/settings/adapters/inbound/http/routes/llm-settings.get.route';
import { route as llmSettingsPutRoute } from '@app/features/settings/adapters/inbound/http/routes/llm-settings.put.route';

export function getRoutes(): RouteDefinition[] {
  return [llmSettingsGetRoute, llmSettingsPutRoute];
}
