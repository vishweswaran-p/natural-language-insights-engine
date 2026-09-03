import type { RouteDefinition } from '@app/shared/http';
import { route as questionsGetRoute } from '@app/features/question/adapters/inbound/http/routes/questions.get.route';
import { route as questionsListRoute } from '@app/features/question/adapters/inbound/http/routes/questions.list.route';
import { route as questionsPostRoute } from '@app/features/question/adapters/inbound/http/routes/questions.post.route';

export function getRoutes(): RouteDefinition[] {
  return [questionsPostRoute, questionsListRoute, questionsGetRoute];
}
