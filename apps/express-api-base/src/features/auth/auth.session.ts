import { db, pool } from '@server/core/db/db';
import connectPgSimple from 'connect-pg-simple';
import { sql } from 'drizzle-orm';
import type { CookieOptions, Request } from 'express';
import session from 'express-session';
import { config } from '../../config/index.js';
import { sessions } from './sessions.table.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

const PgStore = connectPgSimple(session);

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.session.secureCookie,
};

export const sessionMiddleware = session({
  store: new PgStore({ pool, tableName: 'session' }),
  name: config.session.cookieName,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { ...cookieOptions, maxAge: config.session.maxAgeDays * 24 * 60 * 60 * 1000 },
});

/** Signs the user in. A fresh session id is issued to prevent session fixation. */
export function startSession(req: Request, userId: string) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) return reject(regenerateError);
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

export function endSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

/** Ends every session of the user, on all devices. Pass a transaction to run inside it. */
export async function revokeSessions(userId: string, executor: Pick<typeof db, 'delete'> = db) {
  await executor.delete(sessions).where(sql`${sessions.sess}->>'userId' = ${userId}`);
}

export const sessionCookie = { name: config.session.cookieName, options: cookieOptions };
