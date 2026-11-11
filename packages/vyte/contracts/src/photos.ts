import { z } from 'zod';
import { PHOTO_UPLOADER_NAME_MAX_LENGTH } from './photos-limits';
import { tokenSchema } from './token';

export const photoSourceSchema = z.enum(['guest', 'stand']);

export const photoParamsSchema = z.object({ id: z.uuid(), photoId: z.uuid() });
export const uploadParamsSchema = z.object({ token: tokenSchema });
export const uploadPhotoParamsSchema = z.object({ token: tokenSchema, photoId: z.uuid() });

/** The optional name a visitor of the photo stand sends with a photo; empty counts as none. */
export const standUploadSchema = z.object({
  name: z
    .string()
    .trim()
    .max(PHOTO_UPLOADER_NAME_MAX_LENGTH)
    // no control, format or private-use characters: they could hide or reorder a name
    .refine((value) => !/\p{C}/u.test(value), { message: 'Contains invisible characters' })
    .nullish()
    .transform((value) => value || null),
});

export const hidePhotoSchema = z.object({ hidden: z.boolean() });

/** A photo as the hosts see it; the file is served by GET /events/:id/photos/:photoId. */
export const photoSchema = z.object({
  id: z.uuid(),
  source: photoSourceSchema,
  uploaderName: z.string().nullable(),
  width: z.number().int(),
  height: z.number().int(),
  hidden: z.boolean(),
  createdAt: z.iso.datetime(),
});

/** One of the uploader's own photos. */
export const ownPhotoSchema = z.object({
  id: z.uuid(),
  width: z.number().int(),
  height: z.number().int(),
  createdAt: z.iso.datetime(),
});

/** The upload page of a photo link or the stand: own photos, the limit and the window. */
export const uploadSchema = z.object({
  eventTitle: z.string(),
  /** The guest's name through a photo link; `null` on the stand. */
  guestName: z.string().nullable(),
  photos: z.array(ownPhotoSchema),
  limit: z.number().int(),
  left: z.number().int(),
  /** Uploads are open from the start of the event until some days after its end. */
  open: z.boolean(),
  opensAt: z.iso.datetime(),
  closesAt: z.iso.datetime(),
});

export const photosResponseSchema = z.object({ photos: z.array(photoSchema) });
export const photoResponseSchema = z.object({ photo: photoSchema });
export const uploadResponseSchema = z.object({ upload: uploadSchema });

/** What a validated request holds. */
export type StandUploadInput = z.output<typeof standUploadSchema>;
export type HidePhotoInput = z.output<typeof hidePhotoSchema>;

// The wire format as a client sees it. Times are ISO 8601 strings.
export type PhotoDto = z.output<typeof photoSchema>;
export type OwnPhotoDto = z.output<typeof ownPhotoSchema>;
export type UploadDto = z.output<typeof uploadSchema>;
export type PhotosResponseDto = z.output<typeof photosResponseSchema>;
export type PhotoResponseDto = z.output<typeof photoResponseSchema>;
export type UploadResponseDto = z.output<typeof uploadResponseSchema>;
export type HidePhotoDto = z.input<typeof hidePhotoSchema>;
