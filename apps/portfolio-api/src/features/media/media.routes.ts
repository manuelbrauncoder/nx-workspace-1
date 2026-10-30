import { requireAdmin } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config/index.js';
import { mediaParamsSchema } from './media.schemas.js';
import { deleteMedia, getMediaFile, listMedia, uploadMedia } from './media.service.js';

/** Parses one multipart upload from the "file" field into memory. */
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSizeMb * 1024 * 1024, files: 1 },
}).single('file');

export const mediaRouter = Router();

mediaRouter.get('/', requireAdmin, async (_req, res) => {
  res.json({ media: await listMedia() });
});

mediaRouter.post('/', requireAdmin, uploadFile, async (req, res) => {
  res.status(201).json({ media: await uploadMedia(req.file?.buffer) });
});

// public: the start page shows these images to every visitor
mediaRouter.get('/:id', async (req, res) => {
  const { id } = parse(mediaParamsSchema, req.params);
  const file = await getMediaFile(id);
  // an image never changes under its id, so browsers and CDNs may keep it
  res.sendFile(file, { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } });
});

mediaRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = parse(mediaParamsSchema, req.params);
  await deleteMedia(id);
  res.status(204).end();
});
