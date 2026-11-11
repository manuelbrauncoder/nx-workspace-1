import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { eventParamsSchema } from '@vyte/contracts/events';
import { handOverSchema, inviteParamsSchema, memberParamsSchema } from '@vyte/contracts/team';
import { Router } from 'express';
import { noStore } from '../../shared/no-store.js';
import {
  createInvite,
  handOver,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
} from './team.service.js';

/**
 * Members and editor invites of an event, mounted at `/events/:id`. `requireAuth` per route, not
 * on the router: a prefix mount sees every request below `/events/:id`.
 */
export const teamRouter = Router({ mergeParams: true });

teamRouter.get('/members', requireAuth, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ members: await listMembers(currentUserId(req), id) });
});

teamRouter.delete('/members/:userId', requireAuth, async (req, res) => {
  const { id, userId } = parse(memberParamsSchema, req.params);
  await removeMember(currentUserId(req), id, userId);
  res.status(204).end();
});

teamRouter.put('/owner', requireAuth, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const { userId } = parse(handOverSchema, req.body);
  res.json({ members: await handOver(currentUserId(req), id, userId) });
});

// the invites carry live tokens
teamRouter.get('/invites', requireAuth, noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ invites: await listInvites(currentUserId(req), id) });
});

teamRouter.post('/invites', requireAuth, noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.status(201).json({ invite: await createInvite(currentUserId(req), id) });
});

teamRouter.delete('/invites/:inviteId', requireAuth, async (req, res) => {
  const { id, inviteId } = parse(inviteParamsSchema, req.params);
  await revokeInvite(currentUserId(req), id, inviteId);
  res.status(204).end();
});
