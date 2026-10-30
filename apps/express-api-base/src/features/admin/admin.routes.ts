import { updateUserSchema, userParamsSchema } from '@contracts/auth';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import { currentUserId, requireAdmin } from '../auth/auth.middleware.js';
import { deleteUser, listUsers, revokeUserSessions, setRole } from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  res.json({ users: await listUsers() });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { id } = parse(userParamsSchema, req.params);
  const { role } = parse(updateUserSchema, req.body);
  res.json({ user: await setRole(currentUserId(req), id, role) });
});

adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = parse(userParamsSchema, req.params);
  await deleteUser(currentUserId(req), id);
  res.status(204).end();
});

adminRouter.delete('/users/:id/sessions', async (req, res) => {
  const { id } = parse(userParamsSchema, req.params);
  await revokeUserSessions(id);
  res.status(204).end();
});
