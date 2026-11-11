import { createRateLimit } from '@server/core/middleware/rate-limit';
import { parse } from '@server/core/validate';
import { rsvpImageParamsSchema, rsvpParamsSchema, rsvpSchema } from '@vyte/contracts/guests';
import { Router } from 'express';
import { config } from '../../config/index.js';
import { noStore } from '../../shared/no-store.js';
import { tokenParams } from '../../shared/token-params.js';
import { answer, getImageFile, getInvitation } from './rsvp.service.js';

/**
 * The guest page's side of a personal link, public, mounted at `/rsvp`. Reading has no rate
 * limit: the web app renders the page on the server, so every guest arrives from its IP. A
 * token of 32 random bytes cannot be guessed.
 */
export const rsvpRouter = Router();

const NOT_INVITED = 'Invitation not found';

const answerRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.rsvpWindowMinutes,
  maxRequests: config.rateLimit.rsvpMaxRequests,
  message: 'Too many answers, please try again later',
});

rsvpRouter.get('/:token', noStore, async (req, res) => {
  const { token } = tokenParams(rsvpParamsSchema, req, NOT_INVITED);
  res.json({ invitation: await getInvitation(token) });
});

rsvpRouter.put('/:token', noStore, answerRateLimit, async (req, res) => {
  const { token } = tokenParams(rsvpParamsSchema, req, NOT_INVITED);
  const input = parse(rsvpSchema, req.body);
  res.json({ invitation: await answer(token, input) });
});

rsvpRouter.get('/:token/images/:imageId', async (req, res) => {
  const { token, imageId } = tokenParams(rsvpImageParamsSchema, req, NOT_INVITED);
  const file = await getImageFile(token, imageId);
  // revalidated on every use, so a renewed link, a removed guest or the end of the event
  // take effect at once; the ETag keeps that cheap
  res.sendFile(file, { headers: { 'Cache-Control': 'private, no-cache' } });
});
