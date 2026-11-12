import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { DEFAULT_LOG_LEVEL } from '@core/log/log-level';
import express from 'express';
import { join } from 'node:path';
import { seoRoutes } from './server/seo-routes';
import { readServerConfig } from './server/server-config';
import { ServerLog } from './server/server-log';
import { noReferrerOnTokenPages } from './server/token-pages';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** Name of a file the build fingerprinted, e.g. `main-5XYZ7ABC.js`. */
const HASHED_FILE = /-[A-Z0-9]{8}\.\w+$/;

/** Read once at startup, so a changed log level needs a restart. */
const serverConfig = readServerConfig(browserDistFolder);
const serverLog = new ServerLog(serverConfig?.logLevel ?? DEFAULT_LOG_LEVEL);

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * `robots.txt` and `sitemap.xml`. A feature with public pages adds its entries here. The start
 * page is the only one: everything else is behind the sign-in or behind a personal link.
 */
app.use(seoRoutes(serverConfig, () => [{ path: '/' }]));

/**
 * Runtime config, mounted into the container. Unlike the hashed assets below it must be
 * revalidated on every load. `no-cache` would mean the same, but Angular keeps such responses
 * out of the HTTP transfer cache, which would make the browser fetch the config a second time.
 */
app.use(
  '/config',
  express.static(join(browserDistFolder, 'config'), {
    cacheControl: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'max-age=0, must-revalidate'),
  }),
);

/**
 * Serve static files from /browser. The build puts a hash into the names of its own files, so
 * they can be cached for good. Files from `public/`, e.g. icons and the preview image for shared
 * links, keep their name and must be fetched again after a while.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (!HASHED_FILE.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  }),
);

/** A token in the address must not leak through the `Referer` of a link on that page. */
app.use(noReferrerOnTokenPages);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    // Notices, so a deployment that only logs warnings still says what it runs.
    serverLog.notice(`Node Express server listening on http://localhost:${port}`);
    if (serverConfig) {
      serverLog.notice(
        `Environment: ${serverConfig.environment}, log level: ${serverConfig.logLevel}.`,
      );
    } else {
      serverLog.warn('config/app-config.json is missing or invalid, the app will not start.');
    }
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
