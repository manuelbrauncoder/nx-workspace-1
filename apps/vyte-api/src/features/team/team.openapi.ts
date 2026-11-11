import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { eventParamsSchema } from '@vyte/contracts/events';
import { EVENT_EDITORS_MAX } from '@vyte/contracts/events-limits';
import {
  editorInviteResponseSchema,
  editorInvitesResponseSchema,
  handOverSchema,
  inviteParamsSchema,
  memberParamsSchema,
  membersResponseSchema,
} from '@vyte/contracts/team';
import { EDITOR_INVITE_DAYS } from './team.service.js';

export function registerTeamDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Team'], security: sessionAuth };

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events/{id}/members',
    summary: 'List owner and editors',
    description: 'Members only. The owner first, then the editors in the order they joined.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('The members', membersResponseSchema),
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/events/{id}/members/{userId}',
    summary: 'Remove an editor, or leave',
    description:
      'The owner removes an editor (403 for an editor removing someone else, 409 once the ' +
      'event is over); an editor removes themself to leave, also after the event. The owner ' +
      'cannot be removed (409): they hand the event over first.',
    request: { params: memberParamsSchema },
    responses: {
      204: { description: 'Member removed' },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'put',
    path: '/events/{id}/owner',
    summary: 'Hand the event over',
    description:
      'Owner only. The editor named by `userId` becomes the owner, the owner becomes an ' +
      'editor. 404 for someone who is not a member, 409 once the event is over.',
    request: { params: eventParamsSchema, body: jsonContent(handOverSchema) },
    responses: {
      200: jsonResponse('The members with their new roles', membersResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/events/{id}/invites',
    summary: 'List open editor invites',
    description: 'Owner only. Unused invites that have not expired, with their tokens; `no-store`.',
    request: { params: eventParamsSchema },
    responses: {
      200: jsonResponse('Open invites', editorInvitesResponseSchema),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'post',
    path: '/events/{id}/invites',
    summary: 'Create an editor invite',
    description:
      `Owner only. A link that works once and for ${EDITOR_INVITE_DAYS} days; whoever opens it ` +
      `becomes an editor, up to ${EVENT_EDITORS_MAX} editors. 409 once the event is over.`,
    request: { params: eventParamsSchema },
    responses: {
      201: jsonResponse('The new invite with its token', editorInviteResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/events/{id}/invites/{inviteId}',
    summary: 'Revoke an editor invite',
    description: 'Owner only. Only an unused invite can be revoked.',
    request: { params: inviteParamsSchema },
    responses: {
      204: { description: 'Invite revoked' },
      ...errorResponses(400, 401, 403, 404),
    },
  });
}
