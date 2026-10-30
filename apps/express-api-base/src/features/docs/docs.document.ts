import { registerAdminDocs } from '@server/auth/admin.openapi';
import { registerAuthDocs } from '@server/auth/auth.openapi';
import { buildOpenApiDocument, type OpenApiDocument } from '@server/core/openapi';
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
export function buildDocs(): OpenApiDocument {
  return buildOpenApiDocument({
    title: 'Express API Base',
    version: '1.0.0',
    description,
    register: [registerAuthDocs, registerNotesDocs, registerAdminDocs],
  });
}
