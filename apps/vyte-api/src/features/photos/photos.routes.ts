import { currentUserId, requireAuth } from '@server/auth/auth.middleware';
import { badRequest, conflict, HttpError } from '@server/core/errors';
import { logger } from '@server/core/logger';
import { createRateLimit } from '@server/core/middleware/rate-limit';
import { parse } from '@server/core/validate';
import { eventParamsSchema } from '@vyte/contracts/events';
import {
  hidePhotoSchema,
  photoParamsSchema,
  standUploadSchema,
  uploadParamsSchema,
  uploadPhotoParamsSchema,
} from '@vyte/contracts/photos';
import type { Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { config } from '../../config/index.js';
import { apiPrefix } from '../../shared/api.js';
import { readCookie } from '../../shared/cookies.js';
import { noStore } from '../../shared/no-store.js';
import { tokenParams } from '../../shared/token-params.js';
import { getEvent } from '../events/events.service.js';
import {
  addPhoto,
  archiveEntries,
  assertCanUpload,
  deleteOwnPhoto,
  deletePhoto,
  disableStand,
  enableStand,
  guestUploader,
  listPhotos,
  ownPhotoFile,
  photoFile,
  renewStand,
  setHidden,
  standUploader,
  uploadView,
  writeArchive,
} from './photos.service.js';

const NOT_FOUND = 'Upload not found';
// revalidated on every use, so a renewed link or a deleted photo takes effect at once
const PHOTO_CACHE = { 'Cache-Control': 'private, no-cache' };

const uploadRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.uploadWindowMinutes,
  maxRequests: config.rateLimit.uploadMaxRequests,
  message: 'Too many uploads, please try again later',
});

/**
 * At most this many uploads are read at the same time in this process; more answer 503 before
 * their body is read, so many parallel uploads cannot fill the memory.
 */
const MAX_PARALLEL_UPLOADS = 8;
let uploadsInFlight = 0;

const limitParallel: RequestHandler = (_req, res, next) => {
  if (uploadsInFlight >= MAX_PARALLEL_UPLOADS) {
    throw new HttpError(503, 'Too many uploads at the moment, please try again');
  }
  uploadsInFlight++;
  res.once('close', () => uploadsInFlight--);
  next();
};

/** One file in the field `photo`; the stand may add the text field `name`. */
const parseUpload = (fields: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
      files: 1,
      fields,
      parts: fields + 1,
      fieldNameSize: 100,
      fieldSize: 1024,
    },
  }).single('photo');

function fileOf(req: Request): Buffer {
  if (!req.file) throw badRequest('No file in the "photo" field');
  return req.file.buffer;
}

// ---------------------------------------------------------------------------------------------
// A guest's photo link from the place card, public, mounted at `/photos`.

export const photoLinkRouter = Router();

const guestOf = (req: Request) =>
  guestUploader(tokenParams(uploadParamsSchema, req, NOT_FOUND).token);

/** The link and the room for one more photo, before the file is read. */
const canUploadAsGuest: RequestHandler = async (req, _res, next) => {
  await assertCanUpload(await guestOf(req));
  next();
};

photoLinkRouter.get('/:token', noStore, async (req, res) => {
  res.json({ upload: await uploadView(await guestOf(req)) });
});

photoLinkRouter.post(
  '/:token',
  noStore,
  uploadRateLimit,
  canUploadAsGuest,
  limitParallel,
  parseUpload(0),
  async (req, res) => {
    const { token } = tokenParams(uploadParamsSchema, req, NOT_FOUND);
    const uploader = await addPhoto((tx) => guestUploader(token, tx), fileOf(req));
    res.status(201).json({ upload: await uploadView(uploader) });
  },
);

photoLinkRouter.get('/:token/:photoId', async (req, res) => {
  const { token, photoId } = tokenParams(uploadPhotoParamsSchema, req, NOT_FOUND);
  res.sendFile(await ownPhotoFile(await guestUploader(token), photoId), { headers: PHOTO_CACHE });
});

photoLinkRouter.delete('/:token/:photoId', noStore, uploadRateLimit, async (req, res) => {
  const { token, photoId } = tokenParams(uploadPhotoParamsSchema, req, NOT_FOUND);
  const uploader = await guestUploader(token);
  await deleteOwnPhoto(uploader, photoId);
  res.json({ upload: await uploadView(uploader) });
});

// ---------------------------------------------------------------------------------------------
// The photo stand: one shared QR code, a device cookie per phone, mounted at `/stand`.

export const standRouter = Router();

const DEVICE_COOKIE = 'vyte_stand_device';
const DEVICE_ID = /^[A-Za-z0-9_-]{43}$/;

/** The device of the request: its cookie, if it carries a well-formed one. */
function deviceOf(req: Request): string | null {
  const id = readCookie(req, DEVICE_COOKIE);
  return id && DEVICE_ID.test(id) ? id : null;
}

/** Gives a new device its id, once its first photo is stored: random, http-only, only sent to the stand. */
function setDeviceCookie(res: Response, id: string) {
  res.cookie(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.session.secureCookie,
    path: `${apiPrefix}/stand`,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

const standOf = (req: Request) =>
  standUploader(tokenParams(uploadParamsSchema, req, NOT_FOUND).token, deviceOf(req));

/**
 * Uploads at the stand need the device cookie, which `POST /:token/device` gives. Minting it there
 * once, not with every first upload, keeps parallel first uploads of one phone on one device.
 */
const requireDevice: RequestHandler = (req, _res, next) => {
  if (!deviceOf(req)) throw conflict('This device has no id yet');
  next();
};

standRouter.post('/:token/device', noStore, uploadRateLimit, async (req, res) => {
  await standOf(req);
  if (!deviceOf(req)) setDeviceCookie(res, randomBytes(32).toString('base64url'));
  res.status(204).end();
});

const canUploadAtStand: RequestHandler = async (req, _res, next) => {
  await assertCanUpload(await standOf(req));
  next();
};

standRouter.get('/:token', noStore, async (req, res) => {
  res.json({ upload: await uploadView(await standOf(req)) });
});

standRouter.post(
  '/:token',
  noStore,
  uploadRateLimit,
  requireDevice,
  canUploadAtStand,
  limitParallel,
  parseUpload(1),
  async (req, res) => {
    const { token } = tokenParams(uploadParamsSchema, req, NOT_FOUND);
    const { name } = parse(standUploadSchema, req.body ?? {});
    const deviceId = deviceOf(req)!;
    const uploader = await addPhoto((tx) => standUploader(token, deviceId, tx), fileOf(req), name);
    res.status(201).json({ upload: await uploadView(uploader) });
  },
);

standRouter.get('/:token/:photoId', async (req, res) => {
  const { token, photoId } = tokenParams(uploadPhotoParamsSchema, req, NOT_FOUND);
  const uploader = await standUploader(token, deviceOf(req));
  res.sendFile(await ownPhotoFile(uploader, photoId), { headers: PHOTO_CACHE });
});

standRouter.delete('/:token/:photoId', noStore, uploadRateLimit, async (req, res) => {
  const { token, photoId } = tokenParams(uploadPhotoParamsSchema, req, NOT_FOUND);
  const uploader = await standUploader(token, deviceOf(req));
  await deleteOwnPhoto(uploader, photoId);
  res.json({ upload: await uploadView(uploader) });
});

// ---------------------------------------------------------------------------------------------
// For the hosts: the photos of an event, mounted at `/events/:id/photos`.

export const photosRouter = Router({ mergeParams: true });

photosRouter.use(requireAuth);

photosRouter.get('/', noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  res.json({ photos: await listPhotos(currentUserId(req), id) });
});

// before `/:photoId`, which would read "archive" as an id
photosRouter.get('/archive', noStore, async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  const entries = await archiveEntries(currentUserId(req), id);
  res.attachment('photos.zip').type('application/zip');
  try {
    await writeArchive(entries, res);
    res.end();
  } catch (error) {
    // the headers are out, so the error handler cannot answer any more: log it, cut the download
    logger.warn({ err: error }, 'Photo archive aborted');
    res.destroy();
  }
});

photosRouter.get('/:photoId', async (req, res) => {
  const { id, photoId } = parse(photoParamsSchema, req.params);
  res.sendFile(await photoFile(currentUserId(req), id, photoId), { headers: PHOTO_CACHE });
});

photosRouter.patch('/:photoId', noStore, async (req, res) => {
  const { id, photoId } = parse(photoParamsSchema, req.params);
  const { hidden } = parse(hidePhotoSchema, req.body);
  res.json({ photo: await setHidden(currentUserId(req), id, photoId, hidden) });
});

photosRouter.delete('/:photoId', async (req, res) => {
  const { id, photoId } = parse(photoParamsSchema, req.params);
  await deletePhoto(currentUserId(req), id, photoId);
  res.status(204).end();
});

// ---------------------------------------------------------------------------------------------
// The hosts turn the photo stand on and off, mounted at `/events/:id/photo-stand`.

export const photoStandSettingsRouter = Router({ mergeParams: true });

photoStandSettingsRouter.use(requireAuth, noStore);

photoStandSettingsRouter.put('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  await enableStand(currentUserId(req), id);
  res.json({ event: await getEvent(currentUserId(req), id) });
});

photoStandSettingsRouter.delete('/', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  await disableStand(currentUserId(req), id);
  res.json({ event: await getEvent(currentUserId(req), id) });
});

photoStandSettingsRouter.post('/token', async (req, res) => {
  const { id } = parse(eventParamsSchema, req.params);
  await renewStand(currentUserId(req), id);
  res.json({ event: await getEvent(currentUserId(req), id) });
});
