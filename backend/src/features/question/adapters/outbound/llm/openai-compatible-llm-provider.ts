import type { DatasetSchema, LlmProvider, SqlGeneration, Summary } from '@app/features/question/application/ports/llm-provider';
import type { LlmUsage } from '@app/features/question/application/domain/question';
import type { Primitive } from '@app/features/dataset/application/domain/dataset-metadata';
import type { LlmConfig } from './llm-config';

// Single adapter for any OpenAI-compatible Chat Completions API (OpenAI hosted
// or Ollama locally). All HTTP/JSON/provider specifics live here; the question
// layer sees only the LlmProvider port.

const REQUEST_TIMEOUT_MS = 120_000; // local models can be slow, especially cold
const MAX_SUMMARY_ROWS = 50; // cap rows sent to the summarizer to bound prompt size

type ChatMessage = { role: 'system' | 'user'; content: string };

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export class OpenAiCompatibleLlmProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly config: LlmConfig) {
    this.name = `${config.provider}:${config.model}`;
  }

  async generateSql({ question, schema }: { question: string; schema: DatasetSchema }): Promise<SqlGeneration> {
    const { content, usage, latencyMs } = await this.chat(
      [
        { role: 'system', content: SQL_SYSTEM_PROMPT },
        { role: 'user', content: buildSqlPrompt(question, schema) },
      ],
      true,
    );

    const parsed = parseSqlResponse(content);
    return { ...parsed, usage: this.toUsage(usage, latencyMs) };
  }

  async summarize({
    question,
    columns,
    rows,
  }: {
    question: string;
    columns: string[];
    rows: Primitive[][];
  }): Promise<Summary> {
    const { content, usage, latencyMs } = await this.chat(
      [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: buildSummaryPrompt(question, columns, rows) },
      ],
      false,
    );

    return { text: content.trim(), usage: this.toUsage(usage, latencyMs) };
  }

  // One Chat Completions round-trip. Temperature 0 for deterministic output.
  private async chat(
    messages: ChatMessage[],
    jsonMode: boolean,
  ): Promise<{ content: string; usage: ChatCompletionResponse['usage']; latencyMs: number }> {
    const body = {
      model: this.config.model,
      messages,
      temperature: 0,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    const startedAt = Date.now();
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`LLM request failed (${res.status} ${res.statusText}): ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as ChatCompletionResponse;
    return { content: json.choices?.[0]?.message?.content ?? '', usage: json.usage, latencyMs };
  }

  private toUsage(usage: ChatCompletionResponse['usage'], latencyMs: number): LlmUsage {
    const promptTokens = usage?.prompt_tokens ?? null;
    const completionTokens = usage?.completion_tokens ?? null;
    const totalTokens =
      usage?.total_tokens ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null);

    return {
      provider: this.config.provider,
      model: this.config.model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: this.estimateCost(promptTokens, completionTokens),
      latencyMs,
    };
  }

  private estimateCost(promptTokens: number | null, completionTokens: number | null): number | null {
    const pricing = this.config.pricing;
    if (!pricing || promptTokens === null || completionTokens === null) return null;
    const cost = (promptTokens / 1000) * pricing.promptPer1k + (completionTokens / 1000) * pricing.completionPer1k;
    return Math.round(cost * 1e6) / 1e6;
  }
}

// --- prompts + parsing -----------------------------------------------------

const SQL_SYSTEM_PROMPT = [
  'You translate a question into a single DuckDB SQL query over one table named "dataset".',
  'Rules:',
  '- Use ONLY the columns provided. Never invent columns or tables.',
  '- Produce exactly one read-only SELECT statement (no INSERT/UPDATE/DELETE/DDL, no multiple statements).',
  '- If the question cannot be answered from the given columns, do not guess.',
  'Respond with ONLY a JSON object, no markdown or prose:',
  '- Answerable: {"answerable": true, "sql": "<the SQL>"}',
  '- Not answerable: {"answerable": false, "reason": "<short reason>"}',
].join('\n');

const SUMMARY_SYSTEM_PROMPT = [
  'You summarize SQL query results for a business user in 1-3 sentences.',
  'Use ONLY the provided rows; never add numbers or facts that are not present. Be concise and specific.',
].join('\n');

function buildSqlPrompt(question: string, schema: DatasetSchema): string {
  const columns = schema.columns.map((c) => `- "${c.name}" (${c.type})`).join('\n');
  return `Table: ${schema.table} (${schema.rowCount} rows)\nColumns:\n${columns}\n\nQuestion: ${question}`;
}

function buildSummaryPrompt(question: string, columns: string[], rows: Primitive[][]): string {
  const preview = rows.slice(0, MAX_SUMMARY_ROWS);
  return [
    `Question: ${question}`,
    `Result columns: ${JSON.stringify(columns)}`,
    `Rows (JSON, up to ${MAX_SUMMARY_ROWS}): ${JSON.stringify(preview)}`,
    'Write a short natural-language answer.',
  ].join('\n');
}

// Parse the model's JSON. Anything unparseable becomes a refusal — we never
// fabricate an answer from a malformed response.
function parseSqlResponse(content: string): { answerable: boolean; sql: string | null; refusalReason: string | null } {
  const obj = extractJson(content);
  if (!obj || typeof obj.answerable !== 'boolean') {
    return { answerable: false, sql: null, refusalReason: 'The model did not return a valid response.' };
  }
  if (obj.answerable && typeof obj.sql === 'string' && obj.sql.trim().length > 0) {
    return { answerable: true, sql: obj.sql.trim(), refusalReason: null };
  }
  const reason = typeof obj.reason === 'string' && obj.reason.trim() ? obj.reason.trim() : 'The question cannot be answered from this dataset.';
  return { answerable: false, sql: null, refusalReason: reason };
}

// Tolerate models that wrap JSON in prose/markdown by extracting the outermost
// object when a direct parse fails.
function extractJson(content: string): { answerable?: unknown; sql?: unknown; reason?: unknown } | null {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
