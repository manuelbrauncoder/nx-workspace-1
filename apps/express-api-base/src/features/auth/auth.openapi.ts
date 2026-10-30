import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { signInSchema, signUpSchema, userResponseSchema } from '@contracts/auth';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';

export function registerAuthDocs(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'post',
    path: '/auth/sign-up',
    tags: ['Auth'],
    summary: 'Create an account',
    description: 'Creates the user and signs them in: the response sets the session cookie.',
    request: { body: jsonContent(signUpSchema) },
    responses: {
      201: jsonResponse('Account created and signed in', userResponseSchema),
      ...errorResponses(400, 403, 409, 429),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/sign-in',
    tags: ['Auth'],
    summary: 'Sign in',
    description: 'Sets the session cookie. A wrong email and a wrong password give the same 401.',
    request: { body: jsonContent(signInSchema) },
    responses: {
      200: jsonResponse('Signed in', userResponseSchema),
      ...errorResponses(400, 401, 403, 429),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/sign-out',
    tags: ['Auth'],
    summary: 'Sign out',
    description: 'Ends the session and clears the cookie. Succeeds even without a session.',
    responses: {
      204: { description: 'Signed out' },
      ...errorResponses(403),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['Auth'],
    summary: 'Current user',
    security: sessionAuth,
    responses: {
      200: jsonResponse('The signed-in user', userResponseSchema),
      ...errorResponses(401),
    },
  });
}
