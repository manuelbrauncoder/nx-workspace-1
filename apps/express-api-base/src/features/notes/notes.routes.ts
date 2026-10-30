import {
  createNoteSchema,
  imageParamsSchema,
  noteParamsSchema,
  updateNoteSchema,
} from '@contracts/notes';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import { currentUserId, requireAuth } from '../auth/auth.middleware.js';
import { uploadImages } from './notes.images.js';
import {
  addImages,
  createNote,
  deleteImage,
  deleteNote,
  getImageFile,
  getNote,
  listNotes,
  updateNote,
} from './notes.service.js';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', async (req, res) => {
  res.json({ notes: await listNotes(currentUserId(req)) });
});

notesRouter.post('/', async (req, res) => {
  const note = await createNote(currentUserId(req), parse(createNoteSchema, req.body));
  res.status(201).json({ note });
});

notesRouter.get('/:id', async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  res.json({ note: await getNote(currentUserId(req), id) });
});

notesRouter.patch('/:id', async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  const note = await updateNote(currentUserId(req), id, parse(updateNoteSchema, req.body));
  res.json({ note });
});

notesRouter.delete('/:id', async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  await deleteNote(currentUserId(req), id);
  res.status(204).end();
});

notesRouter.post('/:id/images', uploadImages, async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  const files = Array.isArray(req.files) ? req.files : [];
  const images = await addImages(
    currentUserId(req),
    id,
    files.map((file) => file.buffer),
  );
  res.status(201).json({ images });
});

notesRouter.get('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = parse(imageParamsSchema, req.params);
  const file = await getImageFile(currentUserId(req), id, imageId);
  // an image never changes under its id, so the browser may keep it
  res.sendFile(file, { headers: { 'Cache-Control': 'private, max-age=31536000, immutable' } });
});

notesRouter.delete('/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = parse(imageParamsSchema, req.params);
  await deleteImage(currentUserId(req), id, imageId);
  res.status(204).end();
});
