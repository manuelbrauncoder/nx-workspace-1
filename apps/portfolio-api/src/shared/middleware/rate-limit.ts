import { createRateLimit } from '@server/core/middleware/rate-limit';
import { config } from '../../config/index.js';

/** Keeps the contact form from being used to flood the inbox; counted per client IP. */
export const contactRateLimit = createRateLimit({
  windowMinutes: config.rateLimit.contactWindowMinutes,
  maxRequests: config.rateLimit.contactMaxRequests,
  message: 'Too many messages, please try again later',
});
