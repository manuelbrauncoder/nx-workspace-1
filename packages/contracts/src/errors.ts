import { z } from 'zod';

/** Shape of every error response. Messages are English and meant for the log, not the user. */
export const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ErrorResponseDto = z.output<typeof errorSchema>;
