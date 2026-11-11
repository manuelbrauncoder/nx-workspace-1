import type { RequestHandler } from 'express';

/** For answers that carry live tokens or a guest's data: never kept in a browser cache. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
