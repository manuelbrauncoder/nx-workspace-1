import {
  accountInvitesAdminRouter,
  accountInvitesRouter,
} from '@server/auth/account-invites.routes';
import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import { sessionMiddleware } from '@server/auth/auth.session';
import { onUserDeleted } from '@server/auth/user-deletion';
import { createServer } from '@server/core/server';
import packageJson from '../package.json';
import { buildDocs } from './features/docs/docs.document.js';
import { eventsRouter } from './features/events/events.routes.js';
import { removeEventsOfUser } from './features/events/events.user-deletion.js';
import { guestsRouter } from './features/guests/guests.routes.js';
import { invitesRouter } from './features/invites/invites.routes.js';
import { rsvpRouter } from './features/rsvp/rsvp.routes.js';
import {
  saveTheDateRouter,
  saveTheDateSettingsRouter,
} from './features/save-the-date/save-the-date.routes.js';
import { teamRouter } from './features/team/team.routes.js';
import { apiPrefix } from './shared/api.js';

export function createApp() {
  onUserDeleted(removeEventsOfUser);

  return createServer({
    prefix: apiPrefix,
    middleware: [sessionMiddleware],
    // sign-up is closed: accounts come from account links; listed first by convention
    routes: {
      '/auth/account-invites': accountInvitesRouter,
      '/admin/account-invites': accountInvitesAdminRouter,
      '/auth': authRouter,
      '/admin': adminRouter,
      '/events/:id/guests': guestsRouter,
      '/events/:id/save-the-date': saveTheDateSettingsRouter,
      '/events/:id': teamRouter,
      '/events': eventsRouter,
      '/rsvp': rsvpRouter,
      '/invites': invitesRouter,
      '/save-the-date': saveTheDateRouter,
    },
    docs: buildDocs,
    // Kept up to date by `nx release`, reported by /health.
    version: packageJson.version,
  });
}
