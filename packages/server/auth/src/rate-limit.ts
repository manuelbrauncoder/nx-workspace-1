import { config } from '@server/core/config';
import { createRateLimit } from '@server/core/middleware/rate-limit';

/** Slows down password guessing and mass sign-ups; counted per client IP. */
export const authRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.authWindowMinutes,
  maxRequests: config.rateLimit.authMaxRequests,
  message: 'Too many attempts, please try again later',
});
