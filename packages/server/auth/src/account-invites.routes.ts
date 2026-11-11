import {
  acceptAccountInviteSchema,
  accountInviteParamsSchema,
  accountInviteTokenParamsSchema,
  createAccountInviteSchema,
} from '@contracts/account-invites';
import { notFound } from '@server/core/errors';
import { parse } from '@server/core/validate';
import { type Request, Router } from 'express';
import {
  acceptAccountInvite,
  createAccountInvite,
  getOpenAccountInvite,
  listOpenAccountInvites,
  revokeAccountInvite,
} from './account-invites.service';
import { currentUserId, requireAdmin } from './auth.middleware';
import { startSession } from './auth.session';
import { authRateLimit } from './rate-limit';

/**
 * Account links for admins. Opt-in: an app mounts it at `/admin/account-invites`, before
 * `/admin`, together with `accountInvitesRouter`.
 */
export const accountInvitesAdminRouter = Router();

accountInvitesAdminRouter.use(requireAdmin);
// the answers carry live tokens; keep them out of the browser cache
accountInvitesAdminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

accountInvitesAdminRouter.get('/', async (_req, res) => {
  res.json({ invites: await listOpenAccountInvites() });
});

accountInvitesAdminRouter.post('/', async (req, res) => {
  const { name } = parse(createAccountInviteSchema, req.body);
  res.status(201).json({ invite: await createAccountInvite(currentUserId(req), name) });
});

accountInvitesAdminRouter.delete('/:id', async (req, res) => {
  const { id } = parse(accountInviteParamsSchema, req.params);
  await revokeAccountInvite(id);
  res.status(204).end();
});

/**
 * The public side of an account link, mounted at `/auth/account-invites`. Works while
 * `auth.signUpEnabled` is false: the link is the permission. Reading has no rate limit, since a
 * server-rendered page reads it from the server's own IP; creating the account counts against
 * the auth limit.
 */
export const accountInvitesRouter = Router();

/** A malformed token is a 404 like an unknown one, not a 400 that tells it apart. */
function tokenOf(req: Request): string {
  const params = accountInviteTokenParamsSchema.safeParse(req.params);
  if (!params.success) throw notFound('Account link not found');
  return params.data.token;
}

accountInvitesRouter.get('/:token', async (req, res) => {
  res.json({ invite: await getOpenAccountInvite(tokenOf(req)) });
});

accountInvitesRouter.post('/:token', authRateLimit, async (req, res) => {
  const token = tokenOf(req);
  const user = await acceptAccountInvite(token, parse(acceptAccountInviteSchema, req.body));
  await startSession(req, user.id);
  res.status(201).json({ user });
});
