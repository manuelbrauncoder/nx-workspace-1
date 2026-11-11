import { notFound } from '@server/core/errors';
import { createRateLimit } from '@server/core/middleware/rate-limit';
import { parse } from '@server/core/validate';
import { rsvpImageParamsSchema, rsvpParamsSchema, rsvpSchema } from '@vyte/contracts/guests';
import { type Request, Router } from 'express';
import type { z } from 'zod';
import { config } from '../../config/index.js';
import { noStore } from '../../shared/no-store.js';
import { answer, getImageFile, getInvitation } from './rsvp.service.js';

/**
 * The guest page's side of a personal link, public, mounted at `/rsvp`. Reading has no rate
 * limit: the web app renders the page on the server, so every guest arrives from its IP. A
 * token of 32 random bytes cannot be guessed.
 */
export const rsvpRouter = Router();

const answerRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.rsvpWindowMinutes,
  maxRequests: config.rateLimit.rsvpMaxRequests,
  message: 'Too many answers, please try again later',
});

/** A malformed link is a 404 like an unknown one, not a 400 that tells it apart. */
function paramsOf<T extends z.ZodType>(schema: T, req: Request): z.output<T> {
  const params = schema.safeParse(req.params);
  if (!params.success) throw notFound('Invitation not found');
  return params.data;
}

rsvpRouter.get('/:token', noStore, async (req, res) => {
  const { token } = paramsOf(rsvpParamsSchema, req);
  res.json({ invitation: await getInvitation(token) });
});

rsvpRouter.put('/:token', noStore, answerRateLimit, async (req, res) => {
  const { token } = paramsOf(rsvpParamsSchema, req);
  const input = parse(rsvpSchema, req.body);
  res.json({ invitation: await answer(token, input) });
});

rsvpRouter.get('/:token/images/:imageId', async (req, res) => {
  const { token, imageId } = paramsOf(rsvpImageParamsSchema, req);
  const file = await getImageFile(token, imageId);
  // revalidated on every use, so a renewed link, a removed guest or the end of the event
  // take effect at once; the ETag keeps that cheap
  res.sendFile(file, { headers: { 'Cache-Control': 'private, no-cache' } });
});
