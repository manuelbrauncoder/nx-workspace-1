import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { mediaParamsSchema, mediaSchema } from '@portfolio/contracts/media';
import { errorResponses, jsonResponse, sessionAuth } from '@server/core/openapi';
import { z } from 'zod';
import { config } from '../../config/index.js';

const mediaResponse = z.object({ media: mediaSchema });
const { maxFileSizeMb, maxImageWidth } = config.uploads;

export function registerMediaDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Media'], security: sessionAuth };

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/media',
    summary: 'List uploaded images',
    description: 'Newest first. Admin only.',
    responses: {
      200: jsonResponse('All images', z.object({ media: z.array(mediaSchema) })),
      ...errorResponses(401, 403),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/media',
    summary: 'Upload an image',
    description:
      `Admin only. Send one file in the \`file\` field. Accepted: JPEG, PNG, WebP, AVIF, GIF, ` +
      `up to ${maxFileSizeMb} MB. The image is stored as WebP, at most ${maxImageWidth}px wide. ` +
      `Use the returned \`id\` in an image reference of the portfolio content.`,
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
    },
    responses: {
      201: jsonResponse('The created image record', mediaResponse),
      ...errorResponses(400, 401, 403, 413),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/media/{id}',
    tags: ['Media'],
    summary: 'Get an image file',
    description: 'Public, cached for a year: an image never changes under its id.',
    request: { params: mediaParamsSchema },
    responses: {
      200: {
        description: 'The image',
        content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(400, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/media/{id}',
    summary: 'Delete an image',
    description: 'Admin only. Refused with 409 while a portfolio section references the image.',
    request: { params: mediaParamsSchema },
    responses: {
      204: { description: 'Image deleted' },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
