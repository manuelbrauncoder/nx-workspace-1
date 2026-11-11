import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import {
  createEventSchema,
  eventImageParamsSchema,
  eventParamsSchema,
  reorderEventImagesSchema,
  updateEventSchema,
} from '@vyte/contracts/events';
import { type RequestHandler, Router } from 'express';
import { noStore } from '../../shared/no-store.js';
import { uploadImages } from './events.images.js';
import {
  addImages,
  assertCanEdit,
  createEvent,
  deleteEvent,
  deleteImage,
  getEvent,
  getImageFile,
  listEvents,
  reorderImages,
  updateEvent,
} from './events.service.js';

// `noStore` on the answers with an event: they carry the save-the-date link. Not on the
// image files, which may be cached.
export const eventsRouter = Router();

/** Membership and the past-event rule before multer reads the files. */
const canUpload: RequestHandler = async (req, _res, next) => {
  const { id } = parse(eventParamsSchema, req.params);
  await assertCanEdit(currentUserId(req), id);
  next();
};

eventsRouter.use(requireAuth);

eventsRouter.get('/', noStore, async (req, res) => {
  res.json({ events: await listEvents(currentUserId(req)) });
});

eventsRouter.post('/', noStore, async (req, res) => {
  const event = await createEvent(currentUserId(req), parse(createEventSchema, req.body));
  res.status(201).json({ event });
});

eventsRouter.get('/:id', noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ event: await getEvent(currentUserId(req), id) });
});

eventsRouter.patch('/:id', noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const event = await updateEvent(currentUserId(req), id, parse(updateEventSchema, req.body));
  res.json({ event });
});

eventsRouter.delete('/:id', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  await deleteEvent(currentUserId(req), id);
  res.status(204).end();
});

eventsRouter.post('/:id/images', canUpload, uploadImages, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const files = Array.isArray(req.files) ? req.files : [];
  const images = await addImages(
    currentUserId(req),
    id,
    files.map((file) => file.buffer),
  );
  res.status(201).json({ images });
});

eventsRouter.put('/:id/images/order', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const { ids } = parse(reorderEventImagesSchema, req.body);
  res.json({ images: await reorderImages(currentUserId(req), id, ids) });
});

eventsRouter.get('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = parse(eventImageParamsSchema, req.params);
  const file = await getImageFile(currentUserId(req), id, imageId);
  // an image never changes under its id, so the browser may keep it
  res.sendFile(file, { headers: { 'Cache-Control': 'private, max-age=31536000, immutable' } });
});

eventsRouter.delete('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = parse(eventImageParamsSchema, req.params);
  res.json({ images: await deleteImage(currentUserId(req), id, imageId) });
});
