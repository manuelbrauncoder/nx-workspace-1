import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/** The shared settings of every API app plus those of this one. */
export const config = extendConfig({
  // merged into the shared `uploads` settings
  uploads: z.object({
    maxImagesPerNote: z.number().int().positive(),
  }),
});
