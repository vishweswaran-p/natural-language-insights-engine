import path from 'node:path';

// Serve the built frontend (frontend/dist) from the same origin as the API, so
// the whole app runs from a single server. If dist is absent (frontend not built
// yet), serve-static simply falls through and the API keeps working.
//
// serve-static is bundled with Sails; typed loosely here to avoid an extra @types dep.
const serveStatic = require('serve-static') as (root: string, options?: { index?: string | string[] }) => unknown;

const frontendDist = path.resolve(__dirname, '../../../frontend/dist');

export = {
  http: {
    middleware: {
      // API routes ('router') are matched first; anything unmatched falls through
      // to 'frontend', which serves the SPA (index.html + assets).
      order: [
        'cookieParser',
        'session',
        'bodyParser',
        'compress',
        'poweredBy',
        'router',
        'frontend',
        'www',
        'favicon',
      ],
      frontend: serveStatic(frontendDist, { index: 'index.html' }),
    },
  },
};
