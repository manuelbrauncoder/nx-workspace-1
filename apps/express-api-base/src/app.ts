import { createServer } from '@server/core/server';
import { adminRouter } from './features/admin/admin.routes.js';
import { authRouter } from './features/auth/auth.routes.js';
import { sessionMiddleware } from './features/auth/auth.session.js';
import { buildDocs } from './features/docs/docs.document.js';
import { notesRouter } from './features/notes/notes.routes.js';

export function createApp() {
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
