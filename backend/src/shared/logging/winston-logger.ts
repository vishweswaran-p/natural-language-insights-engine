import winston from 'winston';
import type { LogMetadata, Logger } from '@app/shared/logging/logger';

// Winston adapter for the Logger port. Timestamp, level, optional context label,
// message, and structured metadata on every line.
export function createWinstonLogger(defaultMeta: LogMetadata = {}): Logger {
  const level = process.env.LOG_LEVEL ?? 'info';

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => formatLine(info)),
    ),
    transports: [new winston.transports.Console()],
  });

  return wrap(winstonLogger);
}

function wrap(winstonLogger: winston.Logger): Logger {
  return {
    debug: (message, meta) => winstonLogger.debug(message, meta),
    info: (message, meta) => winstonLogger.info(message, meta),
    warn: (message, meta) => winstonLogger.warn(message, meta),
    error: (message, meta) => winstonLogger.error(message, meta),
    child: (bindings) => wrap(winstonLogger.child(bindings)),
  };
}

function formatLine(info: winston.Logform.TransformableInfo): string {
  const { timestamp, level, message, context, ...rest } = info;
  const ctx = typeof context === 'string' && context.length > 0 ? ` [${context}]` : '';
  const meta = formatMeta(rest);
  return `${timestamp} ${level}${ctx}: ${message}${meta}`;
}

// Serialize metadata, pulling Error fields to the top level for readability.
function formatMeta(meta: LogMetadata): string {
  const normalized = normalizeMeta(meta);
  const keys = Object.keys(normalized);
  if (keys.length === 0) return '';
  return ` ${JSON.stringify(normalized)}`;
}

function normalizeMeta(meta: LogMetadata): LogMetadata {
  const out: LogMetadata = {};
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'level' || key === 'splat') continue;
    if (value instanceof Error) {
      out[key] = { message: value.message, stack: value.stack };
    } else {
      out[key] = value;
    }
  }
  return out;
}
