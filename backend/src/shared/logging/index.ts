import type { Logger } from '@app/shared/logging/logger';
import { createWinstonLogger } from '@app/shared/logging/winston-logger';

// Composition root for logging. The rest of the app calls getLogger() and never
// imports Winston directly. To swap loggers, change createWinstonLogger here.
let root: Logger | undefined;

export type { LogMetadata, Logger } from '@app/shared/logging/logger';

export function getLogger(context?: string): Logger {
  if (!root) root = createWinstonLogger();
  return context ? root.child({ context }) : root;
}
