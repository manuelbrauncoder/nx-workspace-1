import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { config } from './config/index.js';
import { adminRouter } from './features/admin/admin.routes.js';
import { authRouter } from './features/auth/auth.routes.js';
import { sessionMiddleware } from './features/auth/auth.session.js';
import { docsRouter } from './features/docs/docs.routes.js';
import { notesRouter } from './features/notes/notes.routes.js';
import { notFound } from './shared/errors.js';
import { logger } from './shared/logger.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { originCheck } from './shared/middleware/origin-check.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(pinoHttp({ logger }));
  // same-site lets the frontend on a sibling subdomain embed images served by this API
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(originCheck);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (config.docs.enabled) app.use('/docs', docsRouter);

  app.use(sessionMiddleware);
  app.use('/auth', authRouter);
  app.use('/notes', notesRouter);
  app.use('/admin', adminRouter);

  app.use(() => {
    throw notFound('Route not found');
  });
  app.use(errorHandler);

  return app;
}
