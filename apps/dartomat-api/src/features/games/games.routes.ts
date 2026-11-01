import {
  createGameSchema,
  gameParamsSchema,
  patchGameSchema,
  throwDartSchema,
} from '@dartomat/contracts/games';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import { createGameRateLimit } from '../../shared/middleware/rate-limit.js';
import { createGame, getGame, patchGame, throwDart, undoDart } from './games.service.js';

/** Public: anyone with the link of a game may play it, there is no sign-in. */
export const gamesRouter = Router();

gamesRouter.post('/', createGameRateLimit, async (req, res) => {
  const game = await createGame(parse(createGameSchema, req.body));
  res.status(201).json({ game });
});

gamesRouter.get('/:id', async (req, res) => {
  const { id } = parse(gameParamsSchema, req.params);
  res.json({ game: await getGame(id) });
});

gamesRouter.patch('/:id', async (req, res) => {
  const { id } = parse(gameParamsSchema, req.params);
  res.json({ game: await patchGame(id, parse(patchGameSchema, req.body)) });
});

gamesRouter.post('/:id/darts', async (req, res) => {
  const { id } = parse(gameParamsSchema, req.params);
  res.status(201).json({ game: await throwDart(id, parse(throwDartSchema, req.body)) });
});

gamesRouter.post('/:id/undo', async (req, res) => {
  const { id } = parse(gameParamsSchema, req.params);
  res.json({ game: await undoDart(id) });
});
