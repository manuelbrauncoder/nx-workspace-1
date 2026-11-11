import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse } from '@server/core/openapi';
import {
  invitationResponseSchema,
  rsvpImageParamsSchema,
  rsvpParamsSchema,
  rsvpSchema,
} from '@vyte/contracts/guests';

export function registerRsvpDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['RSVP'] };
  const notFoundNote =
    'An unknown, malformed, renewed or removed link answers 404, all with the same body.';

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/rsvp/{token}',
    summary: 'Read an invitation',
    description:
      'Public, through the personal link of a guest. The event without guest list, the ' +
      "guest's own answer and whether answers are open. Once the event is over only its " +
      `title. ${notFoundNote}`,
    request: { params: rsvpParamsSchema },
    responses: {
      200: jsonResponse('The invitation', invitationResponseSchema),
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'put',
    path: '/rsvp/{token}',
    summary: 'Answer an invitation',
    description:
      'Accept or decline, with companions up to the allowance and an optional message. ' +
      'Can be changed until the deadline, or until the start without one; after that 409. ' +
      `Rate limited per client IP. ${notFoundNote}`,
    request: { params: rsvpParamsSchema, body: jsonContent(rsvpSchema) },
    responses: {
      200: jsonResponse('The invitation with the new answer', invitationResponseSchema),
      ...errorResponses(400, 403, 404, 409, 429),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/rsvp/{token}/images/{imageId}',
    summary: 'Get an image of the event',
    description: `So the guest page needs no session. 404 once the event is over. ${notFoundNote}`,
    request: { params: rsvpImageParamsSchema },
    responses: {
      200: {
        description: 'The image',
        content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } },
      },
      ...errorResponses(404),
    },
  });
}
