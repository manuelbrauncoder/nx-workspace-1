import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { createRateLimit } from '@server/core/middleware/rate-limit';
import { parse } from '@server/core/validate';
import {
  eventParamsSchema,
  saveTheDateParamsSchema,
  saveTheDateSettingsSchema,
} from '@vyte/contracts/events';
import { Router } from 'express';
import { config } from '../../config/index.js';
import { noStore } from '../../shared/no-store.js';
import { tokenParams } from '../../shared/token-params.js';
import {
  disableSaveTheDate,
  enableSaveTheDate,
  getCoverFile,
  getPreviewImage,
  getSaveTheDate,
  getSaveTheDateCalendar,
  renewSaveTheDateToken,
} from './save-the-date.service.js';

/** Hosts turn save the date on and off, mounted at `/events/:id/save-the-date`. */
export const saveTheDateSettingsRouter = Router({ mergeParams: true });

saveTheDateSettingsRouter.use(requireAuth, noStore);

saveTheDateSettingsRouter.put('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const input = parse(saveTheDateSettingsSchema, req.body);
  res.json({ event: await enableSaveTheDate(currentUserId(req), id, input) });
});

saveTheDateSettingsRouter.delete('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ event: await disableSaveTheDate(currentUserId(req), id) });
});

saveTheDateSettingsRouter.post('/token', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ event: await renewSaveTheDateToken(currentUserId(req), id) });
});

/**
 * The public save-the-date link, mounted at `/save-the-date`. No rate limit: it only reads, and
 * the web app renders the page on the server.
 */
export const saveTheDateRouter = Router();

const NOT_FOUND = 'Save the date not found';

const previewRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.previewWindowMinutes,
  maxRequests: config.rateLimit.previewMaxRequests,
  message: 'Too many requests, please try again later',
});

saveTheDateRouter.get('/:token', noStore, async (req, res) => {
  const { token } = tokenParams(saveTheDateParamsSchema, req, NOT_FOUND);
  res.json({ saveTheDate: await getSaveTheDate(token) });
});

saveTheDateRouter.get('/:token/calendar', noStore, async (req, res) => {
  const { token } = tokenParams(saveTheDateParamsSchema, req, NOT_FOUND);
  const file = await getSaveTheDateCalendar(token);
  res.attachment('event.ics').type('text/calendar; charset=utf-8').send(file);
});

saveTheDateRouter.get('/:token/cover', async (req, res) => {
  const { token } = tokenParams(saveTheDateParamsSchema, req, NOT_FOUND);
  const file = await getCoverFile(token);
  // revalidated on every use, so turning the link off or renewing it takes effect at once
  res.sendFile(file, { headers: { 'Cache-Control': 'private, no-cache' } });
});

// The only limited read: messengers fetch it from their own IPs, never the server rendering.
saveTheDateRouter.get('/:token/preview', previewRateLimit, async (req, res) => {
  const { token } = tokenParams(saveTheDateParamsSchema, req, NOT_FOUND);
  const image = await getPreviewImage(token);
  // revalidated on every use like the cover, so turning the link off or renewing it takes effect
  // at once; the render itself is cached in `previewImage()`
  res.type('image/jpeg').set('Cache-Control', 'private, no-cache').send(image);
});
