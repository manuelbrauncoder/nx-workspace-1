import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/** The shared settings of every API app plus those of this one. */
export const config = extendConfig({
  uploads: z.object({
    dir: z.string().min(1),
    maxFileSizeMb: z.number().positive(),
    maxImagesPerNote: z.number().int().positive(),
    maxImageWidth: z.number().int().positive(),
  }),
});
