import { rateLimit } from 'express-rate-limit';
import { config } from '../../config/index.js';

/** Slows down password guessing and mass sign-ups; counted per client IP. */
export const authRateLimit = rateLimit({
  windowMs: config.rateLimit.authWindowMinutes * 60 * 1000,
  limit: config.rateLimit.authMaxRequests,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later' } },
});
