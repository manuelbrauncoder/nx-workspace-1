import { createServer } from '@server/core/server';
import packageJson from '../package.json';
import { buildDocs } from './features/docs/docs.document.js';
import { gamesRouter } from './features/games/games.routes.js';
import { apiPrefix } from './shared/api.js';

export function createApp() {
  return createServer({
    prefix: apiPrefix,
    routes: {
      '/games': gamesRouter,
    },
    docs: buildDocs,
    // Kept up to date by `nx release`, reported by /health.
    version: packageJson.version,
  });
}
