import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import { sessionMiddleware } from '@server/auth/auth.session';
import { createServer } from '@server/core/server';
import packageJson from '../package.json';
import { buildDocs } from './features/docs/docs.document.js';
import { apiPrefix } from './shared/api.js';

export function createApp() {
  return createServer({
    prefix: apiPrefix,
    middleware: [sessionMiddleware],
    routes: {
      '/auth': authRouter,
      '/admin': adminRouter,
    },
    docs: buildDocs,
    // Kept up to date by `nx release`, reported by /health.
    version: packageJson.version,
  });
}
