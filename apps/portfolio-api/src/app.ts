import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import { sessionMiddleware } from '@server/auth/auth.session';
import { onUserDeleted } from '@server/auth/user-deletion';
import { createServer } from '@server/core/server';
import packageJson from '../package.json';
import { contactRouter } from './features/contact/contact.routes.js';
import { buildDocs } from './features/docs/docs.document.js';
import { legalRouter } from './features/legal/legal.routes.js';
import { mediaRouter } from './features/media/media.routes.js';
import { notesRouter } from './features/notes/notes.routes.js';
import { removeNoteImagesOfUser } from './features/notes/notes.user-deletion.js';
import { portfolioRouter } from './features/portfolio/portfolio.routes.js';
import { apiPrefix } from './shared/api.js';

export function createApp() {
  onUserDeleted(removeNoteImagesOfUser);

  return createServer({
    prefix: apiPrefix,
    middleware: [sessionMiddleware],
    routes: {
      '/auth': authRouter,
      '/notes': notesRouter,
      '/admin': adminRouter,
      '/portfolio': portfolioRouter,
      '/media': mediaRouter,
      '/contact': contactRouter,
      '/legal': legalRouter,
    },
    docs: buildDocs,
    // Kept up to date by `nx release`, reported by /health.
    version: packageJson.version,
  });
}
