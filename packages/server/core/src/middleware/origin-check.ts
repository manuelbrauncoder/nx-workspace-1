import type { RequestHandler } from 'express';
import { config } from '../config';
import { forbidden } from '../errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie sessions: browsers always send Origin on state-changing
 * cross-origin requests, so anything with an Origin outside the allowlist is rejected.
 * Requests without Origin come from non-browser clients, which carry no ambient cookies.
 * The API's own origin is allowed too, so "Try it out" on the /docs page works.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (SAFE_METHODS.has(req.method) || !origin) return next();

  const ownOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin !== ownOrigin && !config.cors.origins.includes(origin)) {
    throw forbidden('Origin not allowed');
  }
  next();
};
