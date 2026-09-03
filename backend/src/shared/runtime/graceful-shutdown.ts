// Register a one-time graceful-shutdown task on SIGINT/SIGTERM. Shared by the
// API bootstrap and the standalone worker so both tear down the same way.
export function onShutdown(task: () => Promise<void> | void): void {
  let handled = false;

  const run = async (signal: string): Promise<void> => {
    if (handled) return;
    handled = true;
    // eslint-disable-next-line no-console
    console.info(`Received ${signal}, shutting down...`);
    try {
      await task();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error during shutdown', err);
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => void run('SIGINT'));
  process.once('SIGTERM', () => void run('SIGTERM'));
}
