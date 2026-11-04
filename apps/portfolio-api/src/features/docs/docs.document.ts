import { registerAdminDocs } from '@server/auth/admin.openapi';
import { registerAuthDocs } from '@server/auth/auth.openapi';
import { buildOpenApiDocument, type OpenApiDocument } from '@server/core/openapi';
import packageJson from '../../../package.json';
import { apiPrefix } from '../../shared/api.js';
import { registerContactDocs } from '../contact/contact.openapi.js';
import { registerLegalDocs } from '../legal/legal.openapi.js';
import { registerMediaDocs } from '../media/media.openapi.js';
import { registerNotesDocs } from '../notes/notes.openapi.js';
import { registerPortfolioDocs } from '../portfolio/portfolio.openapi.js';

const description = `
The backend of the portfolio site. \`GET /portfolio\` returns the editorial content of the start
page; admins change it section by section under \`/portfolio/{section}\`. Images are uploaded
first to \`/media\` and then referenced as \`{ id, alt }\`. Messages from the contact form land
in \`/contact/messages\`. The legal pages (imprint, privacy, accessibility, cookies) are
served as finished HTML fragments under \`/legal/{page}\`. All of these paths are under \`/api/v1\`; only \`/health\` is not.

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
    title: 'Portfolio API',
    version: packageJson.version,
    description,
    prefix: apiPrefix,
    register: [
      registerAuthDocs,
      registerNotesDocs,
      registerAdminDocs,
      registerPortfolioDocs,
      registerMediaDocs,
      registerContactDocs,
      registerLegalDocs,
    ],
  });
}
