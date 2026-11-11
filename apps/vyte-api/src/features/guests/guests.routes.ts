import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { eventParamsSchema } from '@vyte/contracts/events';
import {
  createGuestSchema,
  createGuestsBulkSchema,
  guestParamsSchema,
  hostResponseSchema,
  updateGuestSchema,
} from '@vyte/contracts/guests';
import { Router } from 'express';
import { noStore } from '../../shared/no-store.js';
import {
  addGuest,
  addGuests,
  listGuests,
  recordResponse,
  removeGuest,
  renewToken,
  updateGuest,
} from './guests.service.js';

/** The guest list of an event for its hosts, mounted at `/events/:id/guests`. */
export const guestsRouter = Router({ mergeParams: true });

guestsRouter.use(requireAuth, noStore);

guestsRouter.get('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ guests: await listGuests(currentUserId(req), id) });
});

guestsRouter.post('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const guest = await addGuest(currentUserId(req), id, parse(createGuestSchema, req.body));
  res.status(201).json({ guest });
});

guestsRouter.post('/bulk', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const added = await addGuests(currentUserId(req), id, parse(createGuestsBulkSchema, req.body));
  res.status(201).json({ guests: added });
});

guestsRouter.patch('/:guestId', async (req, res) => {
  const { id, guestId } = parse(guestParamsSchema, req.params);
  const input = parse(updateGuestSchema, req.body);
  res.json({ guest: await updateGuest(currentUserId(req), id, guestId, input) });
});

guestsRouter.put('/:guestId/response', async (req, res) => {
  const { id, guestId } = parse(guestParamsSchema, req.params);
  const input = parse(hostResponseSchema, req.body);
  res.json({ guest: await recordResponse(currentUserId(req), id, guestId, input) });
});

guestsRouter.delete('/:guestId', async (req, res) => {
  const { id, guestId } = parse(guestParamsSchema, req.params);
  await removeGuest(currentUserId(req), id, guestId);
  res.status(204).end();
});

guestsRouter.post('/:guestId/token', async (req, res) => {
  const { id, guestId } = parse(guestParamsSchema, req.params);
  res.json({ guest: await renewToken(currentUserId(req), id, guestId) });
});
