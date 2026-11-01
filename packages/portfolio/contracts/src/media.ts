import { z } from 'zod';

export const mediaParamsSchema = z.object({ id: z.uuid() });

/** An uploaded image as returned by the API; `url` serves the file without a session. */
export const mediaSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  width: z.number().int(),
  height: z.number().int(),
  createdAt: z.iso.datetime(),
});

// The API wraps a single image and the list in `media`.
export const mediaResponseSchema = z.object({ media: mediaSchema });
export const mediaListResponseSchema = z.object({ media: z.array(mediaSchema) });

// The wire format as a client sees it. `createdAt` is an ISO 8601 string.
export type MediaDto = z.output<typeof mediaSchema>;
export type MediaResponseDto = z.output<typeof mediaResponseSchema>;
export type MediaListResponseDto = z.output<typeof mediaListResponseSchema>;
