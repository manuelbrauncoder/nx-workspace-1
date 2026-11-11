import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { eventParamsSchema } from '@vyte/contracts/events';
import {
  createGuestSchema,
  createGuestsBulkSchema,
  guestParamsSchema,
  guestResponseSchema,
  guestsResponseSchema,
  hostResponseSchema,
  updateGuestSchema,
} from '@vyte/contracts/guests';
import { EVENT_GUESTS_MAX, GUESTS_BULK_MAX } from '@vyte/contracts/guests-limits';

export function registerGuestsDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Guests'], security: sessionAuth };
  const write = 'Owner and editors. A past event is read-only and answers 409.';

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events/{id}/guests',
    summary: 'List the guests',
    description:
      'Members only, also for a past event. By name, with the token of each personal link. ' +
      'Sent with `Cache-Control: no-store`.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The guests of the event', guestsResponseSchema),
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events/{id}/guests',
    summary: 'Add a guest',
    description: `${write} At most ${EVENT_GUESTS_MAX} guests per event (409 beyond).`,
    request: { params: eventParamsSchema, body: jsonContent(createGuestSchema) },
    responses: {
      201: jsonResponse('The new guest with their link', guestResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events/{id}/guests/bulk',
    summary: 'Add guests from a list',
    description:
      `${write} One guest per name, up to ${GUESTS_BULK_MAX} at once, all with the same ` +
      `allowance. All or nothing; at most ${EVENT_GUESTS_MAX} guests per event (409 beyond).`,
    request: { params: eventParamsSchema, body: jsonContent(createGuestsBulkSchema) },
    responses: {
      201: jsonResponse('The new guests', guestsResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/events/{id}/guests/{guestId}',
    summary: 'Change a guest',
    description:
      `${write} Name, note and allowance; never the answer. Lowering the allowance below the ` +
      'companions given lowers them too and sets `companionsReduced`.',
    request: { params: guestParamsSchema, body: jsonContent(updateGuestSchema) },
    responses: {
      200: jsonResponse('The updated guest', guestResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'put',
    path: '/events/{id}/guests/{guestId}/response',
    summary: 'Record an answer for a guest',
    description:
      `${write} For an answer given in person; \`answeredBy\` becomes \`host\`. A decline ` +
      'counts no companions. The guest can still change it through the link.',
    request: { params: guestParamsSchema, body: jsonContent(hostResponseSchema) },
    responses: {
      200: jsonResponse('The updated guest', guestResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/events/{id}/guests/{guestId}',
    summary: 'Remove a guest',
    description: `${write} Their link stops working.`,
    request: { params: guestParamsSchema },
    responses: {
      204: { description: 'Guest removed' },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events/{id}/guests/{guestId}/token',
    summary: 'Renew the link of a guest',
    description: `${write} The old link answers 404 from now on.`,
    request: { params: guestParamsSchema },
    responses: {
      200: jsonResponse('The guest with the new link', guestResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
