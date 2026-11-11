import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/** The shared settings of every API app plus those of this one. */
export const config = extendConfig({
  // merged into the shared `rateLimit` settings
  rateLimit: z.object({
    // answers through a guest link, per client IP; reading a link has no limit (server rendering)
    rsvpWindowMinutes: z.number().positive(),
    rsvpMaxRequests: z.number().int().positive(),
  }),
});
