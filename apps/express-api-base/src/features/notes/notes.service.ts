import type { CreateNoteInput, UpdateNoteInput } from '@contracts/notes';
import { db } from '@server/core/db/db';
import { badRequest, notFound } from '@server/core/errors';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { imagePath, processImage, removeImages, saveImage } from './notes.images.js';
import { sanitizeDescription } from './notes.sanitize.js';
import { noteImages, notes } from './notes.table.js';

const noteColumns = {
  id: notes.id,
  title: notes.title,
  description: notes.description,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

const imageColumns = {
  id: noteImages.id,
  width: noteImages.width,
  height: noteImages.height,
  createdAt: noteImages.createdAt,
};

/** Every query goes through this filter, so a note of another user behaves like a missing one. */
const ownedNote = (userId: string, noteId: string) =>
  and(eq(notes.id, noteId), eq(notes.userId, userId));

async function imagesByNote(noteIds: string[]) {
  const byNote = new Map<string, (typeof rows)[number]['image'][]>();
  if (noteIds.length === 0) return byNote;

  const rows = await db
    .select({ noteId: noteImages.noteId, image: imageColumns })
    .from(noteImages)
    .where(inArray(noteImages.noteId, noteIds))
    .orderBy(asc(noteImages.createdAt));

  for (const { noteId, image } of rows) {
    byNote.set(noteId, [...(byNote.get(noteId) ?? []), image]);
  }
  return byNote;
}

export async function listNotes(userId: string) {
  const rows = await db
    .select(noteColumns)
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt));

  const images = await imagesByNote(rows.map((note) => note.id));
  return rows.map((note) => ({ ...note, images: images.get(note.id) ?? [] }));
}

export async function getNote(userId: string, noteId: string) {
  const [note] = await db.select(noteColumns).from(notes).where(ownedNote(userId, noteId));
  if (!note) throw notFound('Note not found');

  const images = await imagesByNote([note.id]);
  return { ...note, images: images.get(note.id) ?? [] };
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const [note] = await db
    .insert(notes)
    .values({
      userId,
      title: input.title,
      description: sanitizeDescription(input.description),
    })
    .returning(noteColumns);

  return { ...note!, images: [] };
}

export async function updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
  const [updated] = await db
    .update(notes)
    .set({
      title: input.title,
      description:
        input.description === undefined ? undefined : sanitizeDescription(input.description),
      updatedAt: new Date(),
    })
    .where(ownedNote(userId, noteId))
    .returning({ id: notes.id });

  if (!updated) throw notFound('Note not found');
  return getNote(userId, noteId);
}

export async function deleteNote(userId: string, noteId: string) {
  const files = await db
    .select({ filename: noteImages.filename })
    .from(noteImages)
    .innerJoin(notes, eq(noteImages.noteId, notes.id))
    .where(ownedNote(userId, noteId));

  // image rows go with the note (cascade); the files are removed afterwards
  const deleted = await db
    .delete(notes)
    .where(ownedNote(userId, noteId))
    .returning({ id: notes.id });
  if (deleted.length === 0) throw notFound('Note not found');

  await removeImages(files.map((file) => file.filename));
}

/** File names of all images of a user, needed to remove the files when the user is deleted. */
export async function imageFilenamesOfUser(userId: string) {
  const files = await db
    .select({ filename: noteImages.filename })
    .from(noteImages)
    .innerJoin(notes, eq(noteImages.noteId, notes.id))
    .where(eq(notes.userId, userId));
  return files.map((file) => file.filename);
}

/** All-or-nothing: if one file is not a valid image, nothing is stored. */
export async function addImages(userId: string, noteId: string, uploads: Buffer[]) {
  await getNote(userId, noteId);
  if (uploads.length === 0) throw badRequest('No files in the "images" field');

  const [existing] = await db
    .select({ value: count() })
    .from(noteImages)
    .where(eq(noteImages.noteId, noteId));
  if ((existing?.value ?? 0) + uploads.length > config.uploads.maxImagesPerNote) {
    throw badRequest(`A note can have at most ${config.uploads.maxImagesPerNote} images`);
  }

  const processed = await Promise.all(uploads.map(processImage));

  const filenames: string[] = [];
  try {
    for (const image of processed) filenames.push(await saveImage(image.data));
    return await db
      .insert(noteImages)
      .values(
        processed.map((image, index) => ({
          noteId,
          filename: filenames[index]!,
          width: image.width,
          height: image.height,
        })),
      )
      .returning(imageColumns);
  } catch (error) {
    await removeImages(filenames);
    throw error;
  }
}

async function findImage(userId: string, noteId: string, imageId: string) {
  const [image] = await db
    .select({ id: noteImages.id, filename: noteImages.filename })
    .from(noteImages)
    .innerJoin(notes, eq(noteImages.noteId, notes.id))
    .where(and(eq(noteImages.id, imageId), ownedNote(userId, noteId)));

  if (!image) throw notFound('Image not found');
  return image;
}

/** Absolute path of the image file, after checking that the note belongs to the user. */
export async function getImageFile(userId: string, noteId: string, imageId: string) {
  const image = await findImage(userId, noteId, imageId);
  return imagePath(image.filename);
}

export async function deleteImage(userId: string, noteId: string, imageId: string) {
  const image = await findImage(userId, noteId, imageId);
  await db.delete(noteImages).where(eq(noteImages.id, image.id));
  await removeImages([image.filename]);
}
