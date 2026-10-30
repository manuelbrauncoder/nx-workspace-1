import { signInSchema, signUpSchema } from '@contracts/auth';
import { unauthorized } from '@server/core/errors';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import { currentUserId, requireAuth } from './auth.middleware';
import { getUser, signIn, signUp } from './auth.service';
import { endSession, sessionCookie, startSession } from './auth.session';
import { authRateLimit } from './rate-limit';

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
