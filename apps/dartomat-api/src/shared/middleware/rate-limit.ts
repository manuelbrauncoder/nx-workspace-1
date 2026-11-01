import { createRateLimit } from '@server/core/middleware/rate-limit';
import { config } from '../../config/index.js';

/** Keeps anyone from filling the database with games; counted per client IP. */
export const createGameRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.createGameWindowMinutes,
  maxRequests: config.rateLimit.createGameMaxRequests,
  message: 'Too many new games, please try again later',
});
