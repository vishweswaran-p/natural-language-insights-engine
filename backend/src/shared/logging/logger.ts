// Logging port. Application code depends only on this interface — never on
// Winston or any other logging library. Swapping the implementation is an
// adapter change with no ripple into features.

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMetadata): void;
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;

  // Returns a logger that always includes the given bindings (e.g. a module name).
  child(bindings: LogMetadata): Logger;
}
