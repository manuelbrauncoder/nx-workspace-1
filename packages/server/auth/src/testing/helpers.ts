import { config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import request from 'supertest';
import { seedAdmin } from '../admin.seed';

/** Empties the tables of auth. The rows of features go with the users by cascade. */
export async function resetAuthTables() {
  await db.execute(sql`TRUNCATE users, session CASCADE`);
}

/** Signs up a new user and returns an agent that keeps the session cookie. */
export async function signedUpAgent(app: Express, email: string) {
  const agent = request.agent(app);
  await agent.post('/auth/sign-up').send({ email, password: 'correct-horse' }).expect(201);
  return agent;
}

/** Creates the configured admin (as the server does at startup) and returns a signed-in agent. */
export async function adminAgent(app: Express) {
  await seedAdmin();
  const agent = request.agent(app);
  await agent.post('/auth/sign-in').send(config.admin).expect(200);
  return agent;
}
