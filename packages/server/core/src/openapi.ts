import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
  type ResponseConfig,
} from '@asteasolutions/zod-to-openapi';
import { errorSchema } from '@contracts/errors';
import { z } from 'zod';
import { config } from './config';

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

export type OpenApiDocument = ReturnType<OpenApiGeneratorV31['generateDocument']>;

export interface OpenApiDocumentOptions {
  title: string;
  version: string;
  /** Markdown shown at the top of the Swagger UI. */
  description: string;
  /** The `register…Docs` functions of the features, in the order they should appear. */
  register: ((registry: OpenAPIRegistry) => void)[];
  /** Base path of the routers, as passed to `createServer()`. The features register without it. */
  prefix?: string;
}

/** Builds the OpenAPI document of an API app, including `/health`. */
export function buildOpenApiDocument({
  title,
  version,
  description,
  register,
  prefix = '',
}: OpenApiDocumentOptions): OpenApiDocument {
  const registry = createRegistry();
  for (const registerDocs of register) registerDocs(registry);
  const definitions = registry.definitions.map((definition) =>
    definition.type === 'route'
      ? { ...definition, route: { ...definition.route, path: prefix + definition.route.path } }
      : definition,
  );

  // Registered after the prefix was applied, since /health stays at the root.
  const system = new OpenAPIRegistry();
  system.registerPath({
    method: 'get',
    path: '/health',
    tags: ['System'],
    summary: 'Health check',
    responses: { 200: jsonResponse('The API is running', z.object({ status: z.literal('ok') })) },
  });

  return new OpenApiGeneratorV31([...system.definitions, ...definitions]).generateDocument({
    openapi: '3.1.0',
    info: { title, version, description },
  });
}
