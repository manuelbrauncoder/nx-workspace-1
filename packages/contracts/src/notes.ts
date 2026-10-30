import { z } from 'zod';
import { NOTE_DESCRIPTION_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from './notes-limits';

const title = z.string().trim().min(1).max(NOTE_TITLE_MAX_LENGTH);
const description = z.string().max(NOTE_DESCRIPTION_MAX_LENGTH);

export const createNoteSchema = z.object({
  title,
  description: description.default(''),
});

export const updateNoteSchema = z
  .object({ title, description })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const noteParamsSchema = z.object({ id: z.uuid() });
export const imageParamsSchema = z.object({ id: z.uuid(), imageId: z.uuid() });

/** An image as returned by the API; the file itself is served by GET /notes/:id/images/:imageId. */
export const noteImageSchema = z.object({
  id: z.uuid(),
  width: z.number().int(),
  height: z.number().int(),
  createdAt: z.iso.datetime(),
});

/** A note as returned by the API. */
export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  images: z.array(noteImageSchema),
});

// The API wraps a note, the list and uploaded images in an object.
export const noteResponseSchema = z.object({ note: noteSchema });
export const notesResponseSchema = z.object({ notes: z.array(noteSchema) });
export const noteImagesResponseSchema = z.object({ images: z.array(noteImageSchema) });

/** What a validated request holds. */
export type CreateNoteInput = z.output<typeof createNoteSchema>;
export type UpdateNoteInput = z.output<typeof updateNoteSchema>;

// The wire format as a client sees it. Timestamps are ISO 8601 strings.
export type NoteDto = z.output<typeof noteSchema>;
export type NoteImageDto = z.output<typeof noteImageSchema>;
/** Body for creating a note, and for updating all editable fields at once. */
export type NoteDraftDto = z.input<typeof createNoteSchema>;
export type NoteResponseDto = z.output<typeof noteResponseSchema>;
export type NotesResponseDto = z.output<typeof notesResponseSchema>;
export type NoteImagesResponseDto = z.output<typeof noteImagesResponseSchema>;
