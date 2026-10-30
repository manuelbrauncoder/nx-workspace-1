import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  updateUserSchema,
  userParamsSchema,
  userResponseSchema,
  usersResponseSchema,
} from '@contracts/auth';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '../../shared/openapi.js';

export function registerAdminDocs(registry: OpenAPIRegistry) {
  const base = { tags: ['Admin'], security: sessionAuth };

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/admin/users',
    summary: 'List all users',
    description: 'Oldest first. Like every admin endpoint, it answers 403 to non-admins.',
    responses: {
      200: jsonResponse('All users', usersResponseSchema),
      ...errorResponses(401, 403),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/admin/users/{id}',
    summary: 'Grant or remove admin rights',
    description:
      "Takes effect on the user's next request. Admins cannot change their own role (409), " +
      'so at least one admin always remains.',
    request: { params: userParamsSchema, body: jsonContent(updateUserSchema) },
    responses: {
      200: jsonResponse('The updated user', userResponseSchema),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/admin/users/{id}',
    summary: 'Delete a user',
    description:
      "Also deletes the user's sessions, notes and images. Admins cannot delete their own " +
      'account (409).',
    request: { params: userParamsSchema },
    responses: {
      204: { description: 'User deleted' },
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/admin/users/{id}/sessions',
    summary: "Revoke a user's sessions",
    description: 'Signs the user out on all devices. They can sign in again.',
    request: { params: userParamsSchema },
    responses: {
      204: { description: 'Sessions revoked' },
      ...errorResponses(400, 401, 403, 404),
    },
  });
}
