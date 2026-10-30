import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import { sessionMiddleware } from '@server/auth/auth.session';
import { onUserDeleted } from '@server/auth/user-deletion';
import { createServer } from '@server/core/server';
import { buildDocs } from './features/docs/docs.document.js';
import { notesRouter } from './features/notes/notes.routes.js';
import { removeNoteImagesOfUser } from './features/notes/notes.user-deletion.js';

export function createApp() {
  onUserDeleted(removeNoteImagesOfUser);

  return createServer({
    middleware: [sessionMiddleware],
    routes: {
      '/auth': authRouter,
      '/notes': notesRouter,
      '/admin': adminRouter,
    },
    docs: buildDocs,
  });
}
