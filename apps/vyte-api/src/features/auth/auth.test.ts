import { config } from '@server/core/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';

/** Smoke tests of the wiring of the shared auth in this app. The logic is tested in server-auth. */

const readConfig = (file: string): { auth: { signUpEnabled: boolean } } =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../config', file), 'utf8'));

describe('auth wiring', () => {
  it('serves the routes under /api/v1 only', async () => {
    await request(app).get('/api/v1/auth/me').expect(401);
    await request(app).get('/auth/me').expect(404);
  });

  it.each(['development.json', 'production.example.json'])(
    'has sign-up closed in config/%s',
    (file) => {
      expect(readConfig(file).auth.signUpEnabled).toBe(false);
    },
  );

  it('refuses sign-ups with 403 while they are disabled', async () => {
    config.auth.signUpEnabled = false;
    try {
      await request(app)
        .post('/api/v1/auth/sign-up')
        .send({ email: 'ada@example.com', password: 'correct-horse' })
        .expect(403);
    } finally {
      config.auth.signUpEnabled = true;
    }
  });

  it('signs the seeded admin in under the prefix', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/v1/auth/me').expect(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('protects the admin routes: 401 without session, 403 for a normal user', async () => {
    await request(app).get('/api/v1/admin/users').expect(401);
    const agent = await signedUpAgent('user@example.com');
    await agent.get('/api/v1/admin/users').expect(403);
  });

  it('sets an http-only session cookie on sign-in', async () => {
    await signedUpAgent('cookie@example.com');
    const res = await request(app)
      .post('/api/v1/auth/sign-in')
      .send({ email: 'cookie@example.com', password: 'correct-horse' })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    const sid = cookies.find((c) => c.startsWith('sid='));
    expect(sid).toBeDefined();
    expect(sid).toMatch(/HttpOnly/i);
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const credentials = { email: 'nobody@example.com', password: 'correct-horse' };

    const foreign = await request(app)
      .post('/api/v1/auth/sign-in')
      .set('Origin', 'https://evil.example')
      .send(credentials)
      .expect(403);
    expect(foreign.body.error.message).toBe('Origin not allowed');

    const allowed = await request(app)
      .post('/api/v1/auth/sign-in')
      .set('Origin', 'http://localhost:4300')
      .send(credentials);
    expect(allowed.body.error?.message).not.toBe('Origin not allowed');
  });
});
