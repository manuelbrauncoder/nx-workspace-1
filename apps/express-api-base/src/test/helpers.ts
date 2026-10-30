import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config/index.js';
import { seedAdmin } from '../features/admin/admin.seed.js';

export const app = createApp();

/** Signs up a new user and returns an agent that keeps the session cookie. */
export async function signedUpAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/auth/sign-up').send({ email, password: 'correct-horse' }).expect(201);
  return agent;
}

/** Creates the configured admin (as the server does at startup) and returns a signed-in agent. */
export async function adminAgent() {
  await seedAdmin();
  const agent = request.agent(app);
  await agent.post('/auth/sign-in').send(config.admin).expect(200);
  return agent;
}
