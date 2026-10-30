import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { z } from 'zod';
import {
  localizedPageSchema,
  pageQuerySchema,
  pageSchema,
  sectionInputSchemas,
  sectionKeys,
  sectionSchemas,
  sectionUpdateSchemas,
} from './portfolio.schemas.js';

export function registerPortfolioDocs(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/portfolio',
    tags: ['Portfolio'],
    summary: 'Get the start page content',
    description:
      'Public. Without `lang` every localized value is `{ de, en }` (for the editor), with ' +
      '`?lang=de` or `?lang=en` it is the value of that language. A section is `null` until ' +
      'it has been created.',
    request: { query: pageQuerySchema },
    responses: {
      200: jsonResponse('The page', z.union([pageSchema, localizedPageSchema])),
      ...errorResponses(400),
    },
  });

  const base = { tags: ['Portfolio'], security: sessionAuth };

  for (const key of sectionKeys) {
    const response = z.object({ [key]: sectionSchemas[key] });

    registry.registerPath({
      ...base,
      method: 'post',
      path: `/portfolio/${key}`,
      summary: `Create the ${key} section`,
      description:
        'Admin only. Both languages are required for every localized value. An image is a ' +
        'reference `{ id, alt }` to an image uploaded with `POST /media`. 409 if the section ' +
        'already exists.',
      request: { body: jsonContent(sectionInputSchemas[key]) },
      responses: {
        201: jsonResponse('Section created', response),
        ...errorResponses(400, 401, 403, 409),
      },
    });

    registry.registerPath({
      ...base,
      method: 'patch',
      path: `/portfolio/${key}`,
      summary: `Change the ${key} section`,
      description:
        'Admin only. Send only the fields to change, at least one; each one replaces the ' +
        'stored value as a whole (arrays included). `null` removes an optional field.',
      request: { body: jsonContent(sectionUpdateSchemas[key]) },
      responses: {
        200: jsonResponse('The changed section', response),
        ...errorResponses(400, 401, 403, 404),
      },
    });
  }
}
