import 'dotenv/config';
import sails = require('sails');
import path from 'node:path';
import { schemaFiles } from '@app/composition/schema';
import { resolveLlmConfig } from '@app/features/question/adapters/outbound/llm/llm-config';
import { getLogger } from '@app/shared/logging';
import { logStartupBanner } from '@app/shared/runtime/startup-banner';

const log = getLogger('server');

// Entry point. Sails is used as a thin HTTP runtime; application code lives under src/.

const port = Number(process.env.PORT) || 1337;
const environment = process.env.NODE_ENV || 'development';

sails.lift(
  {
    appPath: __dirname,
    port,
    environment,
    // API server only — disable unused Sails hooks (views, ORM, sockets, etc.).
    hooks: {
      grunt: false,
      views: false,
      i18n: false,
      pubsub: false,
      sockets: false,
      orm: false,
      session: false,
    },
    blueprints: { actions: false, rest: false, shortcuts: false },
    security: { csrf: false },
    // Application logging goes through Winston (getLogger). Silence Sails' own
    // logger to avoid duplicate, differently-formatted lines in the terminal.
    log: { level: 'silent' },
  },
  (err?: Error) => {
    if (err) {
      log.error('Failed to lift Sails', { err });
      process.exit(1);
      return;
    }

    const llm = resolveLlmConfig();
    const workerInApi = process.env.RUN_WORKER_IN_API !== 'false';

    logStartupBanner(log, {
      port,
      environment,
      llmProvider: llm.provider,
      llmModel: llm.model,
      workerMode: workerInApi ? 'in-process' : 'disabled',
      database: 'connected',
      schemaFiles: schemaFiles.map((f) => path.basename(f)),
    });
  },
);
