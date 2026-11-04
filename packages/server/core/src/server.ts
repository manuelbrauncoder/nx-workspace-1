import cors from 'cors';
import express, { type Express, type RequestHandler, type Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { pool } from './db/db';
import { notFound } from './errors';
import { logger } from './logger';
import { errorHandler } from './middleware/error-handler';
import { originCheck } from './middleware/origin-check';
import type { OpenApiDocument } from './openapi';

export interface ServerOptions {
  /** Runs after the security middleware and before the routes, e.g. the session middleware. */
  middleware?: RequestHandler[];
  /** Routers by the path they are mounted on. */
  routes: Record<string, Router>;
  /**
   * Base path of the routers, e.g. `/api/v1`. `/health` and `/docs` stay at the root, outside
   * the versioning. Pass the same prefix to `buildOpenApiDocument()`.
   */
  prefix?: string;
  /** Builds the OpenAPI document, served under /docs when `docs.enabled` is set in the config. */
  docs?: () => OpenApiDocument;
  /** Version of the app, from its `package.json`. `/health` reports it. */
  version: string;
}

/**
 * The Express app every API app is built on: logging, security headers, CORS for the configured
 * origins, the origin check against CSRF, JSON bodies, `/health`, `/docs`, a 404 for unknown
 * routes and the error handler.
 */
export function createServer({
  middleware = [],
  routes,
  prefix,
  docs,
  version,
}: ServerOptions): Express {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(pinoHttp({ logger }));
  // same-site lets the frontend on a sibling subdomain embed images served by this API
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(originCheck);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  if (docs && config.docs.enabled) app.use('/docs', docsRouter(docs()));

  for (const handler of middleware) app.use(handler);
  const api = express.Router();
  for (const [path, router] of Object.entries(routes)) api.use(path, router);
  app.use(prefix ?? '/', api);

  app.use(() => {
    throw notFound('Route not found');
  });
  app.use(errorHandler);

  return app;
}

function docsRouter(document: OpenApiDocument): Router {
  const router = express.Router();
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document));
  return router;
}

/** Listens on the configured port and closes the server and the database pool on shutdown. */
export function startServer(app: Express): void {
  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port}`);
  });

  function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
