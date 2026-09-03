import type { DatasetMetadata } from '../domain/dataset-metadata';

// Port: turns a natural-language question (plus dataset metadata for grounding)
// into an executable query plan. Minimal placeholder contract for now; the
// query-plan shape will be refined when the LLM adapter is built.

export interface QueryPlan {
  sql: string;
}

export interface LlmProvider {
  generateQueryPlan(question: string, metadata: DatasetMetadata): Promise<QueryPlan>;
}
