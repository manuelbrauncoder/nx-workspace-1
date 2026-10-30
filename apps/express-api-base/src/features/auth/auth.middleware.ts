import type { Request, RequestHandler } from 'express';
import { forbidden, unauthorized } from '../../shared/errors.js';
import { getUser } from './auth.service.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) throw unauthorized();
  next();
};

/** The role is read from the database on every request, so removing it takes effect at once. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const user = await getUser(currentUserId(req));
  if (!user) throw unauthorized();
  if (user.role !== 'admin') throw forbidden('Admin rights required');
  next();
};

/** The signed-in user's id. Use in handlers behind requireAuth. */
export function currentUserId(req: Request): string {
  const { userId } = req.session;
  if (!userId) throw unauthorized();
  return userId;
}
