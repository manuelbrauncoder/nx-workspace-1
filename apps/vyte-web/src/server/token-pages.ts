import type { RequestHandler } from 'express';

/** Pages whose address holds a secret token: account links, invites and the guest pages. */
export const TOKEN_PAGE_PREFIXES = [
  '/welcome/',
  '/invite/',
  '/rsvp/',
  '/photos/',
  '/stand/',
  '/save-the-date/',
] as const;

export function isTokenPage(path: string): boolean {
  return TOKEN_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Keeps the token out of the `Referer` that a token page would send to other sites, e.g. when a
 * guest follows the map link. The API sends the same header for its own token routes.
 */
export const noReferrerOnTokenPages: RequestHandler = (req, res, next) => {
  if (isTokenPage(req.path)) {
    res.setHeader('Referrer-Policy', 'no-referrer');
  }
  next();
};
