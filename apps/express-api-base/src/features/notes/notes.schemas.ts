import { z } from 'zod';

const title = z.string().trim().min(1).max(200);
const description = z.string().max(50_000);

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

export type CreateNoteInput = z.output<typeof createNoteSchema>;
export type UpdateNoteInput = z.output<typeof updateNoteSchema>;
