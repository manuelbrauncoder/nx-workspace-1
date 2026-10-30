import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './docs.document.js';

const document = buildOpenApiDocument();

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(document);
});

docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(document));
