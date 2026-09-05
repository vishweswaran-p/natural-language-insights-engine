import type { Question } from '../types/question';

export function QuestionProvenance({ question }: { question: Question }) {
  if (!question.generatedSql && !question.generateSqlPrompt && !question.summarizePrompt && !question.usage) {
    return null;
  }

  return (
    <div className="question-provenance">
      {question.generateSqlPrompt && (
        <details className="sql-details">
          <summary>View generate SQL prompt</summary>
          <pre className="sql-code">{question.generateSqlPrompt}</pre>
        </details>
      )}
      {question.summarizePrompt && (
        <details className="sql-details">
          <summary>View summarize prompt</summary>
          <pre className="sql-code">{question.summarizePrompt}</pre>
        </details>
      )}
      {question.generatedSql && (
        <details className="sql-details">
          <summary>View generated SQL</summary>
          <pre className="sql-code">{question.generatedSql}</pre>
        </details>
      )}
      {question.usage && <UsageMeta usage={question.usage} />}
    </div>
  );
}

function UsageMeta({ usage }: { usage: NonNullable<Question['usage']> }) {
  return (
    <dl className="usage-meta">
      <UsageItem label="Model" value={`${usage.provider}:${usage.model}`} />
      <UsageItem label="Input" value={formatTokens(usage.promptTokens)} />
      <UsageItem label="Output" value={formatTokens(usage.completionTokens)} />
      <UsageItem label="Total" value={formatTokens(usage.totalTokens)} />
      <UsageItem label="Cost" value={formatCost(usage.estimatedCostUsd)} />
      {usage.latencyMs !== null && <UsageItem label="Latency" value={`${usage.latencyMs.toLocaleString('en-US')} ms`} />}
    </dl>
  );
}

function UsageItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="usage-item">
      <dt className="usage-label">{label}</dt>
      <dd className="usage-value">{value}</dd>
    </div>
  );
}

function formatTokens(tokens: number | null): string {
  return tokens === null ? '—' : tokens.toLocaleString('en-US');
}

function formatCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  return `$${cost.toFixed(cost < 0.01 ? 6 : 4)}`;
}
