import type { Logger } from '@app/shared/logging/logger';
import { createWinstonLogger } from '@app/shared/logging/winston-logger';

let root: Logger | undefined;

export type { LogMetadata, Logger } from '@app/shared/logging/logger';

export function getLogger(context?: string): Logger {
  if (!root) root = createWinstonLogger();
  return context ? root.child({ context }) : root;
}
