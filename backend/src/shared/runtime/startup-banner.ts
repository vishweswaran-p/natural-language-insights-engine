import type { Logger } from '@app/shared/logging/logger';

export interface StartupBannerOptions {
  port: number;
  host?: string;
  environment: string;
  llmProvider: string;
  llmModel: string;
  workerMode: 'in-process' | 'standalone' | 'disabled';
  database: 'connected';
  schemaFiles: readonly string[];
}

const BOX_WIDTH = 66;

// Loud, interview-friendly startup banner. Logged as a single multiline info entry
// so the ASCII box renders cleanly (one timestamp prefix for the whole block).
export function logStartupBanner(log: Logger, options: StartupBannerOptions): void {
  const host = options.host ?? 'localhost';
  const base = `http://${host}:${options.port}`;
  const workerLabel =
    options.workerMode === 'in-process'
      ? 'in-process (ingestion + query)'
      : options.workerMode === 'standalone'
        ? 'standalone process'
        : 'disabled (run worker separately)';

  const lines = [
    '',
    topRule(),
    boxLine(''),
    boxLine('  NATURAL LANGUAGE INSIGHTS ENGINE'),
    boxLine(''),
    boxLine('  >>>  SERVER READY  <<<'),
    boxLine(''),
    midRule(),
    boxLine(`  UI (web app)   ${base}`),
    boxLine(`  API            ${base}/api`),
    boxLine(`  Health         ${base}/health`),
    midRule(),
    boxLine(`  Environment    ${options.environment}`),
    boxLine(`  LLM            ${options.llmProvider}:${options.llmModel}`),
    boxLine(`  Worker         ${workerLabel}`),
    boxLine(`  Database       PostgreSQL (${options.database})`),
    boxLine(`  Schema         ${options.schemaFiles.map((f) => f.replace(/^\d+-create-/, '').replace('.sql', '')).join(', ')}`),
    bottomRule(),
    '',
  ];

  log.info(lines.join('\n'));
}

export interface WorkerStartupBannerOptions {
  environment: string;
  llmProvider: string;
  llmModel: string;
  schemaFiles: readonly string[];
}

// Banner for the standalone worker process (no HTTP server).
export function logWorkerStartupBanner(log: Logger, options: WorkerStartupBannerOptions): void {
  const lines = [
    '',
    topRule(),
    boxLine(''),
    boxLine('  NATURAL LANGUAGE INSIGHTS ENGINE'),
    boxLine(''),
    boxLine('  >>>  BACKGROUND WORKER READY  <<<'),
    boxLine(''),
    midRule(),
    boxLine('  Mode           standalone process'),
    boxLine(`  Environment    ${options.environment}`),
    boxLine(`  LLM            ${options.llmProvider}:${options.llmModel}`),
    boxLine('  Processors     INGESTION, QUERY'),
    boxLine('  Database       PostgreSQL (connected)'),
    boxLine(`  Schema         ${options.schemaFiles.join(', ')}`),
    bottomRule(),
    '',
  ];

  log.info(lines.join('\n'));
}

function boxLine(text: string): string {
  const inner = text.length > BOX_WIDTH - 4 ? text.slice(0, BOX_WIDTH - 7) + '...' : text;
  return `║ ${inner.padEnd(BOX_WIDTH - 2)} ║`;
}

function topRule(): string {
  return `╔${'═'.repeat(BOX_WIDTH)}╗`;
}

function midRule(): string {
  return `╠${'═'.repeat(BOX_WIDTH)}╣`;
}

function bottomRule(): string {
  return `╚${'═'.repeat(BOX_WIDTH)}╝`;
}
