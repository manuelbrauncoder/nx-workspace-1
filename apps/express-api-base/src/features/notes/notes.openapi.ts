import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  createNoteSchema,
  imageParamsSchema,
  noteImagesResponseSchema,
  noteParamsSchema,
  noteResponseSchema,
  notesResponseSchema,
  updateNoteSchema,
} from '@contracts/notes';
import { config } from '../../config/index.js';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '../../shared/openapi.js';

const { maxFileSizeMb, maxImagesPerNote, maxImageWidth } = config.uploads;

export function registerNotesDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Notes'], security: sessionAuth };

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/notes',
    summary: 'List own notes',
    description: 'Newest first, each with its image records.',
    responses: {
      200: jsonResponse("The user's notes", notesResponseSchema),
      ...errorResponses(401),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/notes',
    summary: 'Create a note',
    description:
      'The description is rich text (HTML). It is sanitized on the server: basic formatting, ' +
      'lists and links are kept, everything else is removed. Images are uploaded separately.',
    request: { body: jsonContent(createNoteSchema) },
    responses: {
      201: jsonResponse('Note created', noteResponseSchema),
      ...errorResponses(400, 401, 403),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/notes/{id}',
    summary: 'Get a note',
    request: { params: noteParamsSchema },
    responses: {
      200: jsonResponse('The note', noteResponseSchema),
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/notes/{id}',
    summary: 'Update title and/or description',
    description: 'Send only the fields to change, at least one. Images are not affected.',
    request: { params: noteParamsSchema, body: jsonContent(updateNoteSchema) },
    responses: {
      200: jsonResponse('The updated note', noteResponseSchema),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/notes/{id}',
    summary: 'Delete a note and its images',
    request: { params: noteParamsSchema },
    responses: {
      204: { description: 'Note deleted' },
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/notes/{id}/images',
    summary: 'Upload images to a note',
    description:
      `Send one or more files in the \`images\` field. Accepted: JPEG, PNG, WebP, AVIF, GIF, ` +
      `up to ${maxFileSizeMb} MB per file and ${maxImagesPerNote} images per note. Images are ` +
      `stored as WebP, at most ${maxImageWidth}px wide. All-or-nothing: if one file is not a ` +
      `valid image, nothing is saved.`,
    request: {
      params: noteParamsSchema,
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
      201: jsonResponse('The created image records', noteImagesResponseSchema),
      ...errorResponses(400, 401, 403, 404, 413),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/notes/{id}/images/{imageId}',
    summary: 'Get an image file',
    description: 'Usable directly as the `src` of an `<img>`; the browser sends the cookie.',
    request: { params: imageParamsSchema },
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
    path: '/notes/{id}/images/{imageId}',
    summary: 'Delete an image',
    request: { params: imageParamsSchema },
    responses: {
      204: { description: 'Image deleted' },
      ...errorResponses(400, 401, 403, 404),
    },
  });
}
