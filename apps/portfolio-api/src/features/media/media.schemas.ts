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
