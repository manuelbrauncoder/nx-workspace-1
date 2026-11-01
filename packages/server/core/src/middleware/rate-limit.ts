import { rateLimit } from 'express-rate-limit';

/**
 * Limits how often one client IP may call the routes behind it within a time window. Answers
 * with a 429 in the usual error shape.
 *
 * @example
 * export const contactRateLimit = createRateLimit({
 *   windowMinutes: 10,
 *   maxRequests: 5,
 *   message: 'Too many messages, please try again later',
 * });
 */
export function createRateLimit(options: {
  windowMinutes: number;
  maxRequests: number;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMinutes * 60 * 1000,
    limit: options.maxRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: options.message } },
  });
}
