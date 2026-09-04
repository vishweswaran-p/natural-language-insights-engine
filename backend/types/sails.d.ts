// Minimal ambient declaration for Sails.
//
// The community `@types/sails` packages are stale and pull in a large,
// inaccurate surface. Declare only what this app uses.

declare module 'sails' {
  interface SailsLog {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    debug(...args: unknown[]): void;
  }

  interface SailsApp {
    lift(config: Record<string, unknown>, cb?: (err?: Error) => void): void;
    lower(cb?: (err?: Error) => void): void;
    log: SailsLog;
    config: Record<string, unknown>;
  }

  const sails: SailsApp;
  export = sails;
}
