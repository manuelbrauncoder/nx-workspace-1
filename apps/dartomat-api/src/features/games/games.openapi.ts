import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  createGameSchema,
  gameParamsSchema,
  gameResponseSchema,
  patchGameSchema,
  throwDartSchema,
} from '@dartomat/contracts/games';
import { errorResponses, jsonContent, jsonResponse } from '@server/core/openapi';

export function registerGamesDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Games'] };

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/games',
    summary: 'Start a game',
    description:
      'Public, rate limited per IP. The players play in the order given, everyone starts at 301.',
    request: { body: jsonContent(createGameSchema) },
    responses: {
      201: jsonResponse('The new game', gameResponseSchema),
      ...errorResponses(400, 403, 429),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/games/{id}',
    summary: 'Get a game',
    description: 'Includes the checkout recommendation for the current player.',
    request: { params: gameParamsSchema },
    responses: {
      200: jsonResponse('The game', gameResponseSchema),
      ...errorResponses(400, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/games/{id}',
    summary: 'Switch double-out or restart',
    description:
      '`restart` sets every score back to the start score, removes all darts and keeps the ' +
      'players in their order. It also works on a finished game.',
    request: { params: gameParamsSchema, body: jsonContent(patchGameSchema) },
    responses: {
      200: jsonResponse('The changed game', gameResponseSchema),
      ...errorResponses(400, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/games/{id}/darts',
    summary: 'Throw a dart',
    description:
      'For the current player. A bust resets the score to the start of the turn and passes on ' +
      'to the next player. 409 when the game is already finished.',
    request: { params: gameParamsSchema, body: jsonContent(throwDartSchema) },
    responses: {
      201: jsonResponse('The game after the dart', gameResponseSchema),
      ...errorResponses(400, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/games/{id}/undo',
    summary: 'Take back the last dart',
    description: 'Also the winning dart, which reopens the game. 409 when no dart was thrown.',
    request: { params: gameParamsSchema },
    responses: {
      200: jsonResponse('The game before the dart', gameResponseSchema),
      ...errorResponses(400, 403, 404, 409),
    },
  });
}
