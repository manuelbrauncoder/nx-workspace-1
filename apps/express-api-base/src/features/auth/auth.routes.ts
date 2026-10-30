import { signInSchema, signUpSchema } from '@contracts/auth';
import { Router } from 'express';
import { unauthorized } from '../../shared/errors.js';
import { authRateLimit } from '../../shared/middleware/rate-limit.js';
import { parse } from '../../shared/validate.js';
import { currentUserId, requireAuth } from './auth.middleware.js';
import { getUser, signIn, signUp } from './auth.service.js';
import { endSession, sessionCookie, startSession } from './auth.session.js';

export const authRouter = Router();

authRouter.post('/sign-up', authRateLimit, async (req, res) => {
  const user = await signUp(parse(signUpSchema, req.body));
  await startSession(req, user.id);
  res.status(201).json({ user });
});

authRouter.post('/sign-in', authRateLimit, async (req, res) => {
  const user = await signIn(parse(signInSchema, req.body));
  await startSession(req, user.id);
  res.json({ user });
});

authRouter.post('/sign-out', async (req, res) => {
  await endSession(req);
  res.clearCookie(sessionCookie.name, sessionCookie.options);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await getUser(currentUserId(req));
  if (!user) throw unauthorized();
  res.json({ user });
});
