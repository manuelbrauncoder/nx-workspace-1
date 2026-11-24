import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  localizedPageSchema,
  pageQuerySchema,
  pageSchema,
  sectionInputSchemas,
  sectionKeys,
  sectionSchemas,
  sectionUpdateSchemas,
} from '@portfolio/contracts/portfolio';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { z } from 'zod';

export function registerPortfolioDocs(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/portfolio',
    tags: ['Portfolio'],
    summary: 'Get the start page content',
    description:
      'Public. Without `lang` every localized value is `{ de, en }` (for the editor), with ' +
      '`?lang=de` or `?lang=en` it is the value of that language. A section is `null` until ' +
      'it has been created. A project with `published: false` is a draft: it is only ' +
      'included when the request has an admin session, so the answer varies by cookie. Only ' +
      'the text of a draft is hidden: its images under `/media/{id}` stay public by URL.',
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
        'reference `{ id, alt }` to an image uploaded with `POST /media`. A project has 1 to ' +
        '10 `images` in page order, the first one is the cover; its `description` is HTML in ' +
        'the formats of the rich-text editor and is sanitized before it is stored. ' +
        '`published: false` saves a project as a draft that only admins see; without the ' +
        'field the project is published. `tags` are up to 5 short labels of a project, ' +
        'e.g. "Work project" or a company, each `{ label, color }` with a localized label ' +
        'and one of the fixed colours; without the field a project has none. 409 if the ' +
        'section already exists.',
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
        'stored value as a whole (arrays included), so reordering the images of a project ' +
        'means sending its `images` in the new order. `null` removes an optional field.',
      request: { body: jsonContent(sectionUpdateSchemas[key]) },
      responses: {
        200: jsonResponse('The changed section', response),
        ...errorResponses(400, 401, 403, 404),
      },
    });
  }
}
