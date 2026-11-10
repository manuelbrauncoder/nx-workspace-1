import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  legalPageKeys,
  legalPageSchema,
  legalPagesSchema,
  legalPageUpdateSchema,
  legalQuerySchema,
} from '@portfolio/contracts/legal';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { z } from 'zod';

export function registerLegalDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Legal'] };

  registry.registerPath({
    ...base,
    security: sessionAuth,
    method: 'get',
    path: '/legal',
    summary: 'Get all legal pages for the editor',
    description:
      'Admin only. Every page with the sanitized HTML of both languages. A page is `null` ' +
      'until it has been created.',
    responses: {
      200: jsonResponse('All pages', legalPagesSchema),
      ...errorResponses(401, 403),
    },
  });

  for (const key of legalPageKeys) {
    registry.registerPath({
      ...base,
      method: 'get',
      path: `/legal/${key}`,
      summary: `Get the ${key} page as HTML`,
      description:
        'Public. The finished HTML fragment (no `<html>` or `<body>`), meant to be inserted ' +
        'into the layout of the web app. `lang` defaults to `de`.',
      request: { query: legalQuerySchema },
      responses: {
        200: { description: 'The page', content: { 'text/html': { schema: z.string() } } },
        ...errorResponses(400, 404),
      },
    });

    registry.registerPath({
      ...base,
      security: sessionAuth,
      method: 'patch',
      path: `/legal/${key}`,
      summary: `Change the ${key} page`,
      description:
        'Admin only. Send `de`, `en` or both; each sent language replaces its stored HTML as a ' +
        'whole. With both languages a missing page is created, with one it is a 404. The ' +
        'HTML is sanitized to the formats of the editor: `p`, `br`, `h2`, `h3`, `ul`, `ol`, ' +
        '`li`, `blockquote`, `strong`, `em` and `a` with an absolute `http`, `https` or ' +
        '`mailto` link, a `tel:` number or a path of the site starting with a single `/`; a ' +
        'link with any other `href` loses its attributes and everything else is removed. The ' +
        'web app renders the `h1`.',
      request: { body: jsonContent(legalPageUpdateSchema) },
      responses: {
        200: jsonResponse('The changed page', z.object({ [key]: legalPageSchema })),
        ...errorResponses(400, 401, 403, 404),
      },
    });
  }
}
