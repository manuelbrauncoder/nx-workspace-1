import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import {
  eventParamsSchema,
  eventResponseSchema,
  saveTheDateParamsSchema,
  saveTheDateResponseSchema,
  saveTheDateSettingsSchema,
} from '@vyte/contracts/events';

const calendarContent = {
  'text/calendar': { schema: { type: 'string' as const, format: 'binary' } },
};

export function registerSaveTheDateDocs(registry: OpenAPIRegistry) {
  const host = { tags: ['Save the date'], security: sessionAuth };
  const write = 'Owner and editors. A past event is read-only and answers 409.';

  registry.registerPath({
    ...host,
    method: 'put',
    path: '/events/{id}/save-the-date',
    summary: 'Turn save the date on, or change its note',
    description: `${write} Creates the link if there is none; the event carries it as \`saveTheDate\`.`,
    request: { params: eventParamsSchema, body: jsonContent(saveTheDateSettingsSchema) },
    responses: {
      200: jsonResponse('The event with its save-the-date link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...host,
    method: 'delete',
    path: '/events/{id}/save-the-date',
    summary: 'Turn save the date off',
    description:
      'Owner and editors, also after the event. The link answers 404 from now on; the note ' +
      'is removed.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event without a save-the-date link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...host,
    method: 'post',
    path: '/events/{id}/save-the-date/token',
    summary: 'Renew the save-the-date link',
    description: `${write} The old link answers 404 from now on. 404 while save the date is off.`,
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event with the new link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  const link = { tags: ['Save the date'] };
  const notFoundNote =
    'An unknown, malformed, renewed or turned-off link answers 404, all with the same body.';

  registry.registerPath({
    ...link,
    method: 'get',
    path: '/save-the-date/{token}',
    summary: 'Read a save the date',
    description:
      'Public. Date, place name and note, never the address or names. Once the event is ' +
      `over only its title. ${notFoundNote}`,
    request: { params: saveTheDateParamsSchema },
    responses: {
      200: jsonResponse('The save the date', saveTheDateResponseSchema),
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    ...link,
    method: 'get',
    path: '/save-the-date/{token}/calendar',
    summary: 'Calendar file of a save the date',
    description: `An \`.ics\` file with the place name, without the address. 404 once the event is over. ${notFoundNote}`,
    request: { params: saveTheDateParamsSchema },
    responses: {
      200: { description: 'The calendar file', content: calendarContent },
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    ...link,
    method: 'get',
    path: '/save-the-date/{token}/cover',
    summary: 'Cover image of a save the date',
    description: `404 without an image and once the event is over. ${notFoundNote}`,
    request: { params: saveTheDateParamsSchema },
    responses: {
      200: {
        description: 'The image',
        content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    ...link,
    method: 'get',
    path: '/save-the-date/{token}/preview',
    summary: 'Preview image of a shared save the date',
    description: `The cover cut to 1200 × 630 as JPEG, for \`og:image\`. 404 without an image and once the event is over. ${notFoundNote}`,
    request: { params: saveTheDateParamsSchema },
    responses: {
      200: {
        description: 'The image',
        content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(404),
    },
  });
}
