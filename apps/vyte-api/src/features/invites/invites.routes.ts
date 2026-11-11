import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { startSession } from '@server/auth/auth.session';
import { authRateLimit } from '@server/auth/rate-limit';
import { parse } from '@server/core/validate';
import { inviteSignUpSchema, inviteTokenParamsSchema } from '@vyte/contracts/team';
import { Router } from 'express';
import { noStore } from '../../shared/no-store.js';
import { tokenParams } from '../../shared/token-params.js';
import { getEvent } from '../events/events.service.js';
import { acceptInvite, getPublicInvite, signUpWithInvite } from './invites.service.js';

/**
 * The link of an editor invite, mounted at `/invites`. Reading has no rate limit (the web app
 * renders the page on the server); accepting and creating an account count against the auth
 * limit.
 */
export const invitesRouter = Router();

const NOT_INVITED = 'Invite not found';

invitesRouter.get('/:token', noStore, async (req, res) => {
  const { token } = tokenParams(inviteTokenParamsSchema, req, NOT_INVITED);
  res.json({ invite: await getPublicInvite(token) });
});

invitesRouter.post('/:token/accept', requireAuth, authRateLimit, async (req, res) => {
  const { token } = tokenParams(inviteTokenParamsSchema, req, NOT_INVITED);
  const userId = currentUserId(req);
  const eventId = await acceptInvite(userId, token);
  res.json({ event: await getEvent(userId, eventId) });
});

invitesRouter.post('/:token/sign-up', authRateLimit, async (req, res) => {
  const { token } = tokenParams(inviteTokenParamsSchema, req, NOT_INVITED);
  const input = parse(inviteSignUpSchema, req.body);
  const { userId, eventId } = await signUpWithInvite(token, input);
  await startSession(req, userId);
  res.status(201).json({ event: await getEvent(userId, eventId) });
});
