import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  acceptAccountInviteSchema,
  accountInviteParamsSchema,
  accountInviteResponseSchema,
  accountInvitesResponseSchema,
  accountInviteTokenParamsSchema,
  createAccountInviteSchema,
  publicAccountInviteResponseSchema,
} from '@contracts/account-invites';
import { userResponseSchema } from '@contracts/auth';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { ACCOUNT_INVITE_DAYS } from './account-invites.service';

/** The docs of `accountInvitesAdminRouter` and `accountInvitesRouter`; register both together. */
export function registerAccountInviteDocs(registry: OpenAPIRegistry) {
  const admin = { tags: ['Account links'], security: sessionAuth };

  registry.registerPath({
    ...admin,
    method: 'get',
    path: '/admin/account-invites',
    summary: 'List open account links',
    description: 'Unused links that have not expired, oldest first. Admins only.',
    responses: {
      200: jsonResponse('Open account links', accountInvitesResponseSchema),
      ...errorResponses(401, 403),
    },
  });

  registry.registerPath({
    ...admin,
    method: 'post',
    path: '/admin/account-invites',
    summary: 'Create an account link',
    description:
      `The admin names the account; the person sets email and password through the link. ` +
      `The link works once and for ${ACCOUNT_INVITE_DAYS} days. Admins only.`,
    request: { body: jsonContent(createAccountInviteSchema) },
    responses: {
      201: jsonResponse('The new link with its token', accountInviteResponseSchema),
      ...errorResponses(400, 401, 403),
    },
  });

  registry.registerPath({
    ...admin,
    method: 'delete',
    path: '/admin/account-invites/{id}',
    summary: 'Revoke an account link',
    description: 'Only an unused link can be revoked. Admins only.',
    request: { params: accountInviteParamsSchema },
    responses: {
      204: { description: 'Link revoked' },
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/account-invites/{token}',
    tags: ['Account links'],
    summary: 'Read an account link',
    description:
      'The name the admin gave the account. An unknown, used or expired link answers 404, ' +
      'all with the same body.',
    request: { params: accountInviteTokenParamsSchema },
    responses: {
      200: jsonResponse('The open link', publicAccountInviteResponseSchema),
      ...errorResponses(404),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/account-invites/{token}',
    tags: ['Account links'],
    summary: 'Create the account of a link',
    description:
      'Creates the user, marks the link used and signs them in: the response sets the session ' +
      'cookie. Works while sign-up is closed. Without a name the account takes the one of the ' +
      'link. A taken email answers 409 and leaves the link open.',
    request: {
      params: accountInviteTokenParamsSchema,
      body: jsonContent(acceptAccountInviteSchema),
    },
    responses: {
      201: jsonResponse('Account created and signed in', userResponseSchema),
      ...errorResponses(400, 403, 404, 409, 429),
    },
  });
}
