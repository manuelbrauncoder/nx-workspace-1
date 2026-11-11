import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { eventResponseSchema } from '@vyte/contracts/events';
import {
  inviteSignUpSchema,
  inviteTokenParamsSchema,
  publicEditorInviteResponseSchema,
} from '@vyte/contracts/team';

export function registerInvitesDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Editor invites'] };
  const notFoundNote =
    'An unknown, malformed, used, expired or revoked link, or one to an event that is over, ' +
    'answers 404, all with the same body.';

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/invites/{token}',
    summary: 'Read an editor invite',
    description: `Public. Who invites to which event; the owner's name only if set. ${notFoundNote}`,
    request: { params: inviteTokenParamsSchema },
    responses: {
      200: jsonResponse('The invite', publicEditorInviteResponseSchema),
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/invites/{token}/accept',
    summary: 'Accept an editor invite',
    description:
      'Makes the signed-in user an editor and uses up the link. A member opening it, also the ' +
      'editor who used it, gets the event and the link stays as it is. 409 when the event has ' +
      `its maximum of editors. Counts against the auth rate limit. ${notFoundNote}`,
    security: sessionAuth,
    request: { params: inviteTokenParamsSchema },
    responses: {
      200: jsonResponse('The event', eventResponseSchema),
      ...errorResponses(401, 403, 404, 409, 429),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/invites/{token}/sign-up',
    summary: 'Create an account through an editor invite',
    description:
      'Works while sign-up is closed: the link is the permission. Creates the account, makes ' +
      'it an editor and signs in (sets the session cookie). A taken email answers 409 and ' +
      `leaves the link open. Counts against the auth rate limit. ${notFoundNote}`,
    request: { params: inviteTokenParamsSchema, body: jsonContent(inviteSignUpSchema) },
    responses: {
      201: jsonResponse('The event', eventResponseSchema),
      ...errorResponses(400, 403, 404, 409, 429),
    },
  });
}
