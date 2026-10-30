import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createRegistry, jsonResponse } from '../../shared/openapi.js';
import { registerAdminDocs } from '../admin/admin.openapi.js';
import { registerAuthDocs } from '../auth/auth.openapi.js';
import { registerNotesDocs } from '../notes/notes.openapi.js';

const description = `
Authentication uses an HTTP-only session cookie, set by sign-up and sign-in. Browser clients
must send requests with credentials (\`credentials: "include"\` in fetch, \`withCredentials: true\`
in Angular).

A note with images is created in two steps: create the note as JSON, then upload the files
to \`/notes/{id}/images\` as multipart form data.

All errors have the shape \`{ "error": { "message": "...", "details": [...] } }\`.
`;

/** Builds the OpenAPI document. A new feature adds its register function here. */
export function buildOpenApiDocument() {
  const registry = createRegistry();

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['System'],
    summary: 'Health check',
    responses: { 200: jsonResponse('The API is running', z.object({ status: z.literal('ok') })) },
  });
  registerAuthDocs(registry);
  registerNotesDocs(registry);
  registerAdminDocs(registry);

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'Express API Base', version: '1.0.0', description },
  });
}
