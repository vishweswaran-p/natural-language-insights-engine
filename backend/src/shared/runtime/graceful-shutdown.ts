import { getLogger } from '@app/shared/logging';

const log = getLogger('runtime');

// Register a one-time graceful-shutdown task on SIGINT/SIGTERM. Shared by the
// API bootstrap and the standalone worker so both tear down the same way.
export function onShutdown(task: () => Promise<void> | void): void {
  let handled = false;

  const run = async (signal: string): Promise<void> => {
    if (handled) return;
    handled = true;
    log.info('Shutdown signal received', { signal });
    try {
      await task();
      log.info('Shutdown complete');
    } catch (err) {
      log.error('Error during shutdown', { err });
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => void run('SIGINT'));
  process.once('SIGTERM', () => void run('SIGTERM'));
}
