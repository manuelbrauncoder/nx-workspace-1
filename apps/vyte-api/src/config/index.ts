import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/** The shared settings of every API app plus those of this one. */
export const config = extendConfig({
  // merged into the shared `rateLimit` settings
  rateLimit: z.object({
    // answers through a guest link, per client IP; reading a link has no limit (server rendering)
    rsvpWindowMinutes: z.number().positive(),
    rsvpMaxRequests: z.number().int().positive(),
    // photo uploads through a guest's photo link or the photo stand, per client IP
    uploadWindowMinutes: z.number().positive().default(15),
    // a venue shares one IP over its Wi-Fi; parallel uploads are capped separately
    uploadMaxRequests: z.number().int().positive().default(200),
  }),
  // guest photos, see docs/vyte/spec.md section 3; defaults so a config without them stays valid
  photos: z
    .object({
      maxPerGuest: z.number().int().positive(),
      maxPerDevice: z.number().int().positive(),
      // a ZIP without ZIP64 holds at most 65 535 files
      maxPerEvent: z.number().int().positive().max(65_535),
      // the share of the stand, so a stand link that went around cannot fill the event
      maxPerStand: z.number().int().positive(),
      uploadDaysAfterEnd: z.number().int().min(0),
      maxImageWidth: z.number().int().positive(),
    })
    .default({
      maxPerGuest: 6,
      maxPerDevice: 6,
      maxPerEvent: 1000,
      maxPerStand: 500,
      uploadDaysAfterEnd: 7,
      maxImageWidth: 2560,
    }),
});
