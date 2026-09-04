import 'dotenv/config';
import sails = require('sails');
import { getLogger } from '@app/shared/logging';

const log = getLogger('server');

// Entry point / composition of the HTTP runtime.
//
// Sails is used purely as a thin HTTP + runtime framework. All application and
// domain logic lives under `src/` and is framework-agnostic.
//
// This file is compiled to `dist/app.js`; `__dirname` therefore points at the
// compiled `dist/` directory, which is what we hand to Sails as its `appPath`
// so it loads the compiled `config/` and `api/controllers/`.

const port = Number(process.env.PORT) || 1337;

sails.lift(
  {
    appPath: __dirname,
    port,
    environment: process.env.NODE_ENV || 'development',
    // Keep Sails lean: this is an API server, not a full-stack MVC app. Hooks
    // for views/assets/ORM/sockets are disabled until a later phase needs them.
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
    log.info('NLIE backend listening', { url: `http://localhost:${port}`, port });
  },
);
