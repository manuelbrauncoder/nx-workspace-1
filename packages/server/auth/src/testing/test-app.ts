import { createServer } from '@server/core/server';
import type { Express } from 'express';
import { accountInvitesAdminRouter, accountInvitesRouter } from '../account-invites.routes';
import { adminRouter } from '../admin.routes';
import { authRouter } from '../auth.routes';
import { sessionMiddleware } from '../auth.session';
import * as helpers from './helpers';

/** An API app with nothing but auth, for the specs of this lib. */
export const app: Express = createServer({
  middleware: [sessionMiddleware],
  // the account links are opt-in; listed first by convention, as in the apps
  routes: {
    '/auth/account-invites': accountInvitesRouter,
    '/admin/account-invites': accountInvitesAdminRouter,
    '/auth': authRouter,
    '/admin': adminRouter,
  },
  version: '0.0.0-test',
});

export const signedUpAgent = (email: string) => helpers.signedUpAgent(app, email);
export const adminAgent = () => helpers.adminAgent(app);
