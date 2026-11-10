import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import {
  createEventSchema,
  eventImageParamsSchema,
  eventImagesResponseSchema,
  eventParamsSchema,
  eventResponseSchema,
  eventsResponseSchema,
  reorderEventImagesSchema,
  updateEventSchema,
} from '@vyte/contracts/events';
import { EVENT_IMAGES_MAX } from '@vyte/contracts/events-limits';
import { config } from '../../config/index.js';

const { maxFileSizeMb, maxImageWidth } = config.uploads;

export function registerEventsDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Events'], security: sessionAuth };
  const pastNote = 'A past event is read-only and answers 409.';

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events',
    summary: 'List own events',
    description:
      'The events the user is a member of, with their role. Upcoming events first, soonest ' +
      'first; then past events, most recent first.',
    responses: {
      200: jsonResponse("The user's events", eventsResponseSchema),
      ...errorResponses(401),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events',
    summary: 'Create an event',
    description:
      'The user becomes its owner. Only `title`, `startsAt` and `timeZone` are required. Times ' +
      'are ISO 8601 with an offset; for an all-day event only the day of `startsAt` and `endsAt` in `timeZone` counts (send midnight) ' +
      'for the first and the last day. The end may not be before the start, the ' +
      'deadline not after it. The description is sanitized to the rich-text formats.',
    request: { body: jsonContent(createEventSchema) },
    responses: {
      201: jsonResponse('The created event', eventResponseSchema),
      ...errorResponses(400, 401, 403),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events/{id}',
    summary: 'Get an event',
    description: 'An event the user is not a member of answers 404.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event', eventResponseSchema),
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/events/{id}',
    summary: 'Change an event',
    description: `Owner and editors. Any subset of the fields. ${pastNote}`,
    request: { params: eventParamsSchema, body: jsonContent(updateEventSchema) },
    responses: {
      200: jsonResponse('The updated event', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/events/{id}',
    summary: 'Delete an event',
    description:
      'Owner only (403 for an editor), also for a past event. Members, images and everything ' +
      'else of the event go with it.',
    request: { params: eventParamsSchema },
    responses: {
      204: { description: 'Event deleted' },
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events/{id}/images',
    summary: 'Upload images to an event',
    description:
      `Owner and editors. Send one or more files in the \`images\` field. Accepted: JPEG, PNG, ` +
      `WebP, AVIF, GIF, up to ${maxFileSizeMb} MB per file and ${EVENT_IMAGES_MAX} images per ` +
      `event (409 beyond). Stored as WebP, at most ${maxImageWidth}px wide, appended after the ` +
      `existing ones. All-or-nothing. ${pastNote}`,
    request: {
      params: eventParamsSchema,
      body: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['images'],
              properties: {
                images: { type: 'array', items: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
      },
    },
    responses: {
      201: jsonResponse('All images of the event in their order', eventImagesResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409, 413),
    },
  });

  registry.registerPath({
    ...base,
    method: 'put',
    path: '/events/{id}/images/order',
    summary: 'Reorder the images',
    description: `Owner and editors. \`ids\` lists every image of the event once; the first is the cover image. ${pastNote}`,
    request: { params: eventParamsSchema, body: jsonContent(reorderEventImagesSchema) },
    responses: {
      200: jsonResponse('All images of the event in their order', eventImagesResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events/{id}/images/{imageId}',
    summary: 'Get an image file',
    description:
      'Members only. Usable directly as the `src` of an `<img>`; the browser sends the cookie.',
    request: { params: eventImageParamsSchema },
    responses: {
      200: {
        description: 'The image',
        content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/events/{id}/images/{imageId}',
    summary: 'Delete an image',
    description: `Owner and editors. The others move up. ${pastNote}`,
    request: { params: eventImageParamsSchema },
    responses: {
      200: jsonResponse('The remaining images in their order', eventImagesResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
