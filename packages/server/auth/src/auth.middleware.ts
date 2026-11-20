import { forbidden, unauthorized } from '@server/core/errors';
import type { Request, RequestHandler } from 'express';
import { getUser } from './auth.service';

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

/**
 * Whether the request comes from a signed-in admin, for public routes that show admins more.
 * Never throws for a guest; the role is read from the database like in requireAdmin.
 */
export async function isAdmin(req: Request): Promise<boolean> {
  const { userId } = req.session;
  if (!userId) return false;
  const user = await getUser(userId);
  return user?.role === 'admin';
}

/** The signed-in user's id. Use in handlers behind requireAuth. */
export function currentUserId(req: Request): string {
  const { userId } = req.session;
  if (!userId) throw unauthorized();
  return userId;
}
