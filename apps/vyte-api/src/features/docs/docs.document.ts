import { registerAccountInviteDocs } from '@server/auth/account-invites.openapi';
import { registerAdminDocs } from '@server/auth/admin.openapi';
import { registerAuthDocs } from '@server/auth/auth.openapi';
import { buildOpenApiDocument, type OpenApiDocument } from '@server/core/openapi';
import packageJson from '../../../package.json';
import { apiPrefix } from '../../shared/api.js';
import { registerEventsDocs } from '../events/events.openapi.js';
import { registerGuestsDocs } from '../guests/guests.openapi.js';
import { registerInvitesDocs } from '../invites/invites.openapi.js';
import { registerLegalDocs } from '../legal/legal.openapi.js';
import { registerPhotosDocs } from '../photos/photos.openapi.js';
import { registerRsvpDocs } from '../rsvp/rsvp.openapi.js';
import { registerSaveTheDateDocs } from '../save-the-date/save-the-date.openapi.js';
import { registerTeamDocs } from '../team/team.openapi.js';

const description = `
The backend of vyte: events, their guest lists and the answers of the guests, and the
legal pages of the site. All paths are
under \`/api/v1\`; only \`/health\` is not.

Authentication uses an HTTP-only session cookie, set by sign-in. Browser clients must send
requests with credentials (\`credentials: "include"\` in fetch, \`withCredentials: true\` in
Angular). Sign-up is closed: an admin creates an account link, the person sets email and
password through it.

All errors have the shape \`{ "error": { "message": "...", "details": [...] } }\`.
`;

/** Builds the OpenAPI document. A new feature adds its register function here. */
export function buildDocs(): OpenApiDocument {
  return buildOpenApiDocument({
    title: 'vyte API',
    version: packageJson.version,
    description,
    prefix: apiPrefix,
    register: [
      registerAuthDocs,
      registerAccountInviteDocs,
      registerAdminDocs,
      registerEventsDocs,
      registerGuestsDocs,
      registerRsvpDocs,
      registerTeamDocs,
      registerInvitesDocs,
      registerSaveTheDateDocs,
      registerPhotosDocs,
      registerLegalDocs,
    ],
  });
}
