import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { eventParamsSchema, eventResponseSchema } from '@vyte/contracts/events';
import {
  hidePhotoSchema,
  photoParamsSchema,
  photoResponseSchema,
  photosResponseSchema,
  uploadParamsSchema,
  uploadPhotoParamsSchema,
  uploadResponseSchema,
} from '@vyte/contracts/photos';
import { PHOTO_UPLOADER_NAME_MAX_LENGTH } from '@vyte/contracts/photos-limits';
import { config } from '../../config/index.js';

const { maxPerGuest, maxPerDevice, maxPerEvent, maxPerStand, uploadDaysAfterEnd, maxImageWidth } =
  config.photos;
const image = { 'image/webp': { schema: { type: 'string' as const, format: 'binary' } } };

function uploadBody(withName: boolean) {
  return {
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object' as const,
          required: ['photo'],
          properties: {
            photo: { type: 'string' as const, format: 'binary' },
            ...(withName && {
              name: { type: 'string' as const, maxLength: PHOTO_UPLOADER_NAME_MAX_LENGTH },
            }),
          },
        },
      },
    },
  };
}

export function registerPhotosDocs(registry: OpenAPIRegistry) {
  const window =
    `Uploads are open from the start of the event until ${uploadDaysAfterEnd} days after its ` +
    `end (409 outside), at most ${maxPerEvent} photos per event (409 beyond). One JPEG, PNG, ` +
    `WebP, AVIF or GIF per request in the field \`photo\`, stored as WebP at most ` +
    `${maxImageWidth}px wide, without metadata. Rate limited per client IP; 503 while too many uploads run at once.`;
  const notFoundNote =
    'An unknown, malformed, renewed or turned-off link answers 404, all with the same body.';

  // a guest's photo link
  const link = { tags: ['Photos'] };
  registry.registerPath({
    ...link,
    method: 'get',
    path: '/photos/{token}',
    summary: 'Upload page of a photo link',
    description: `Public, the link of a place card. The guest's own photos, the limit and the window. ${notFoundNote}`,
    request: { params: uploadParamsSchema },
    responses: {
      200: jsonResponse('The upload page', uploadResponseSchema),
      ...errorResponses(404),
    },
  });
  registry.registerPath({
    ...link,
    method: 'post',
    path: '/photos/{token}',
    summary: 'Upload a photo through a photo link',
    description: `At most ${maxPerGuest} photos per guest (409 beyond). ${window} ${notFoundNote}`,
    request: { params: uploadParamsSchema, body: uploadBody(false) },
    responses: {
      201: jsonResponse('The upload page with the new photo', uploadResponseSchema),
      ...errorResponses(400, 403, 404, 409, 413, 429, 503),
    },
  });
  registry.registerPath({
    ...link,
    method: 'get',
    path: '/photos/{token}/{photoId}',
    summary: 'Get an own photo through a photo link',
    description: `Only the guest's own photos. ${notFoundNote}`,
    request: { params: uploadPhotoParamsSchema },
    responses: { 200: { description: 'The photo', content: image }, ...errorResponses(404) },
  });
  registry.registerPath({
    ...link,
    method: 'delete',
    path: '/photos/{token}/{photoId}',
    summary: 'Delete an own photo through a photo link',
    description: `Also outside the upload window. ${notFoundNote}`,
    request: { params: uploadPhotoParamsSchema },
    responses: {
      200: jsonResponse('The upload page without the photo', uploadResponseSchema),
      ...errorResponses(403, 404),
    },
  });

  // the photo stand
  const deviceNote =
    'The device is known by the http-only cookie `vyte_stand_device`, which ' +
    '`POST /stand/{token}/device` sets and which is sent only to `/api/v1/stand`.';
  registry.registerPath({
    ...link,
    method: 'get',
    path: '/stand/{token}',
    summary: 'Upload page of the photo stand',
    description: `Public. The photos of this device, the limit and the window. ${deviceNote} ${notFoundNote}`,
    request: { params: uploadParamsSchema },
    responses: {
      200: jsonResponse('The upload page', uploadResponseSchema),
      ...errorResponses(404),
    },
  });
  registry.registerPath({
    ...link,
    method: 'post',
    path: '/stand/{token}',
    summary: 'Upload a photo at the photo stand',
    description:
      `Needs the device cookie (409 without). At most ${maxPerDevice} photos per device and ` +
      `${maxPerStand} through the stand (409 beyond); an optional \`name\` says who took it. ` +
      `${window} ${deviceNote} ${notFoundNote}`,
    request: { params: uploadParamsSchema, body: uploadBody(true) },
    responses: {
      201: jsonResponse('The upload page with the new photo', uploadResponseSchema),
      ...errorResponses(400, 403, 404, 409, 413, 429, 503),
    },
  });
  registry.registerPath({
    ...link,
    method: 'post',
    path: '/stand/{token}/device',
    summary: 'Give this device an id at the photo stand',
    description:
      'Sets the device cookie if the device has none yet; call it once before the first ' +
      `upload, then upload in parallel. Rate limited per client IP. ${notFoundNote}`,
    request: { params: uploadParamsSchema },
    responses: { 204: { description: 'The device has an id' }, ...errorResponses(403, 404, 429) },
  });

  registry.registerPath({
    ...link,
    method: 'get',
    path: '/stand/{token}/{photoId}',
    summary: 'Get a photo of this device',
    description: `Only the photos of this device. ${notFoundNote}`,
    request: { params: uploadPhotoParamsSchema },
    responses: { 200: { description: 'The photo', content: image }, ...errorResponses(404) },
  });
  registry.registerPath({
    ...link,
    method: 'delete',
    path: '/stand/{token}/{photoId}',
    summary: 'Delete a photo of this device',
    description: `Also outside the upload window. ${notFoundNote}`,
    request: { params: uploadPhotoParamsSchema },
    responses: {
      200: jsonResponse('The upload page without the photo', uploadResponseSchema),
      ...errorResponses(403, 404),
    },
  });

  // for the hosts
  const host = { tags: ['Photos'], security: sessionAuth };
  registry.registerPath({
    ...host,
    method: 'get',
    path: '/events/{id}/photos',
    summary: 'List the photos of an event',
    description: 'Members only, also after the event. Newest first, with uploader and `hidden`.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The photos', photosResponseSchema),
      ...errorResponses(400, 401, 404),
    },
  });
  registry.registerPath({
    ...host,
    method: 'get',
    path: '/events/{id}/photos/archive',
    summary: 'Download the photos as ZIP',
    description: 'Members only. All visible photos, named `<uploader>-<n>.webp`.',
    request: { params: eventParamsSchema },
    responses: {
      200: {
        description: 'The archive',
        content: { 'application/zip': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(400, 401, 404),
    },
  });
  registry.registerPath({
    ...host,
    method: 'get',
    path: '/events/{id}/photos/{photoId}',
    summary: 'Get a photo file',
    description: 'Members only, hidden photos too.',
    request: { params: photoParamsSchema },
    responses: {
      200: { description: 'The photo', content: image },
      ...errorResponses(400, 401, 404),
    },
  });
  registry.registerPath({
    ...host,
    method: 'patch',
    path: '/events/{id}/photos/{photoId}',
    summary: 'Hide or show a photo',
    description: 'Owner and editors, also after the event. Hidden photos stay out of the ZIP.',
    request: { params: photoParamsSchema, body: jsonContent(hidePhotoSchema) },
    responses: {
      200: jsonResponse('The photo', photoResponseSchema),
      ...errorResponses(400, 401, 403, 404),
    },
  });
  registry.registerPath({
    ...host,
    method: 'delete',
    path: '/events/{id}/photos/{photoId}',
    summary: 'Delete a photo',
    description: 'Owner and editors, also after the event.',
    request: { params: photoParamsSchema },
    responses: { 204: { description: 'Photo deleted' }, ...errorResponses(400, 401, 403, 404) },
  });

  // the photo stand and the photo links
  registry.registerPath({
    ...host,
    method: 'put',
    path: '/events/{id}/photo-stand',
    summary: 'Turn the photo stand on',
    description:
      'Owner and editors. Creates the link of the stand once; the event carries it as ' +
      '`photoStand`. 409 once the event is over.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event with the stand link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
  registry.registerPath({
    ...host,
    method: 'delete',
    path: '/events/{id}/photo-stand',
    summary: 'Turn the photo stand off',
    description: 'Owner and editors, also after the event. The link answers 404; the photos stay.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event without a stand link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404),
    },
  });
  registry.registerPath({
    ...host,
    method: 'post',
    path: '/events/{id}/photo-stand/token',
    summary: 'Renew the link of the photo stand',
    description: 'Owner and editors. The old link answers 404. 404 while off, 409 after the event.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The event with the new stand link', eventResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
