import { OpenAPIRegistry, type ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { config } from '../config/index.js';

/** Shape of every error response, see middleware/error-handler.ts. */
export const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

const ERROR_DESCRIPTIONS = {
  400: 'Invalid input; `details` lists the failing fields',
  401: 'Not signed in',
  403: 'Request came from an origin that is not allowed, or admin rights are missing',
  404: 'Not found, or it belongs to another user',
  409: 'Conflict with existing data, or an admin changing their own account',
  413: 'Upload too large',
  429: 'Too many attempts',
} as const;

export function createRegistry() {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: config.session.cookieName,
    description: 'Session cookie set by sign-up and sign-in',
  });
  return registry;
}

/** Marks an endpoint as requiring the session cookie. */
export const sessionAuth = [{ cookieAuth: [] }];

export const jsonContent = (schema: z.ZodType) => ({
  content: { 'application/json': { schema } },
});

export const jsonResponse = (description: string, schema: z.ZodType): ResponseConfig => ({
  description,
  ...jsonContent(schema),
});

export function errorResponses(...statuses: (keyof typeof ERROR_DESCRIPTIONS)[]) {
  return Object.fromEntries(
    statuses.map((status) => [status, jsonResponse(ERROR_DESCRIPTIONS[status], errorSchema)]),
  );
}
