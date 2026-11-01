import { buildOpenApiDocument, type OpenApiDocument } from '@server/core/openapi';
import { apiPrefix } from '../../shared/api.js';
import { registerGamesDocs } from '../games/games.openapi.js';

const description = `
The backend of Dartomat, a scoreboard for 301. A game is created with \`POST /games\` and then
played dart by dart under \`/games/{id}\`. There is no sign-in: whoever has the id of a game can
play it. All of these paths are under \`/api/v1\`; only \`/health\` is not.

Every response with a game has the shape \`{ "game": { ... } }\`, including the checkout
recommendation for the current player.

All errors have the shape \`{ "error": { "message": "...", "details": [...] } }\`.
`;

/** Builds the OpenAPI document. A new feature adds its register function here. */
export function buildDocs(): OpenApiDocument {
  return buildOpenApiDocument({
    title: 'Dartomat API',
    version: '1.0.0',
    description,
    prefix: apiPrefix,
    register: [registerGamesDocs],
  });
}
