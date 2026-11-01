import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/**
 * The shared settings of every API app plus those of dartomat. Dartomat has no sign-in, the
 * shared `session` and `admin` keys are only there because every API app's config has them.
 */
export const config = extendConfig({
  // merged into the shared `rateLimit` settings
  rateLimit: z.object({
    createGameWindowMinutes: z.number().positive(),
    createGameMaxRequests: z.number().int().positive(),
  }),
});
