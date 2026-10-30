import { extendConfig } from '@server/core/config';
import { z } from 'zod';

/** The shared settings of every API app plus those of the portfolio. */
export const config = extendConfig(
  {
    // where clients reach this API; the base of the image URLs in the portfolio content
    publicUrl: z.url().transform((url) => new URL(url).origin),
    // merged into the shared `rateLimit` settings
    rateLimit: z.object({
      contactWindowMinutes: z.number().positive(),
      contactMaxRequests: z.number().int().positive(),
    }),
    // SMTP account that forwards contact messages; disabled, nothing is sent (see shared/mail.ts)
    mail: z.object({
      enabled: z.boolean(),
      host: z.string().min(1),
      port: z.number().int().positive(),
      secure: z.boolean(),
      user: z.string().min(1),
      // sender, e.g. "Portfolio <api@example.com>"
      from: z.string().min(1),
      to: z.email(),
    }),
    // merged into the shared `uploads` settings
    uploads: z.object({
      maxImagesPerNote: z.number().int().positive(),
    }),
  },
  {
    // required while mail.enabled is true; an empty value counts as unset
    SMTP_PASSWORD: z
      .string()
      .optional()
      .transform((value) => value || undefined),
  },
);

if (config.mail.enabled && !config.env.SMTP_PASSWORD) {
  console.error('Invalid configuration: SMTP_PASSWORD must be set while mail.enabled is true');
  process.exit(1);
}
