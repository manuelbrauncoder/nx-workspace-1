import { config } from '@server/core/config';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './testing/test-app';

const credentials = { email: 'Ada@Example.com', password: 'correct-horse' };

describe('auth', () => {
  it('signs up, normalizes the email and signs the user in', async () => {
    const agent = request.agent(app);
    const signUp = await agent
      .post('/auth/sign-up')
      .send({ ...credentials, name: '  Ada  ' })
      .expect(201);

    expect(signUp.body.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada',
      role: 'user',
    });
    expect(signUp.body.user).not.toHaveProperty('passwordHash');
    expect(signUp.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.user.email).toBe('ada@example.com');
  });

  it('treats the name as optional', async () => {
    const res = await request(app).post('/auth/sign-up').send(credentials).expect(201);
    expect(res.body.user.name).toBeNull();
  });

  it('refuses sign-ups while they are disabled', async () => {
    config.auth.signUpEnabled = false;
    try {
      const res = await request(app).post('/auth/sign-up').send(credentials).expect(403);
      expect(res.body.error.message).toBe('Sign-up is disabled');
    } finally {
      config.auth.signUpEnabled = true;
    }

    await request(app).post('/auth/sign-in').send(credentials).expect(401);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/auth/sign-up').send(credentials).expect(201);
    await request(app).post('/auth/sign-up').send(credentials).expect(409);
  });

  it('rejects invalid input', async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual([
      'email',
      'password',
    ]);
  });

  it('signs in with the right password only', async () => {
    await request(app).post('/auth/sign-up').send(credentials).expect(201);

    await request(app)
      .post('/auth/sign-in')
      .send({ ...credentials, password: 'wrong-password' })
      .expect(401);
    await request(app)
      .post('/auth/sign-in')
      .send({ email: 'nobody@example.com', password: 'correct-horse' })
      .expect(401);

    const agent = request.agent(app);
    await agent.post('/auth/sign-in').send(credentials).expect(200);
    await agent.get('/auth/me').expect(200);
  });

  it('signs out', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/sign-up').send(credentials).expect(201);
    await agent.post('/auth/sign-out').expect(204);
    await agent.get('/auth/me').expect(401);
  });

  it('requires a session', async () => {
    await request(app).get('/auth/me').expect(401);
  });

  it('rejects state-changing requests from an unknown origin', async () => {
    await request(app)
      .post('/auth/sign-in')
      .set('Origin', 'https://evil.example.com')
      .send(credentials)
      .expect(403);
  });
});
