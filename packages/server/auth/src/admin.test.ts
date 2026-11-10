import { config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { logger } from '@server/core/logger';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { seedAdmin } from './admin.seed';
import { adminAgent, app, signedUpAgent } from './testing/test-app';
import { onUserDeleted } from './user-deletion';
import { users } from './users.table';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

async function idOf(agent: Awaited<ReturnType<typeof signedUpAgent>>): Promise<string> {
  const me = await agent.get('/auth/me').expect(200);
  return me.body.user.id;
}

/** Makes process.exit throw instead of ending the test run, and silences the fatal log. */
function mockExit() {
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit');
  });
  const fatal = vi.spyOn(logger, 'fatal').mockImplementation(() => undefined);
  return { exit, fatal };
}

describe('admin', () => {
  it('seeds the configured admin only once', async () => {
    await seedAdmin();
    const admin = await adminAgent();

    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users).toHaveLength(1);
    expect(list.body.users[0]).toMatchObject({ email: config.admin.email, role: 'admin' });
  });

  it('ends the process instead of creating an admin with a placeholder password in production', async () => {
    const { exit, fatal } = mockExit();
    try {
      await expect(seedAdmin({ admin: config.admin, nodeEnv: 'production' })).rejects.toThrow(
        'process.exit',
      );

      expect(exit).toHaveBeenCalledWith(1);
      expect(fatal).toHaveBeenCalledWith(expect.stringContaining('placeholder'));
      expect(fatal).not.toHaveBeenCalledWith(expect.stringContaining(config.admin.password));
      expect(await db.select().from(users)).toHaveLength(0);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('creates the admin with a strong password in production', async () => {
    const admin = { email: 'ops@example.com', password: 'a-long-production-password' };
    await seedAdmin({ admin, nodeEnv: 'production' });

    const agent = request.agent(app);
    await agent.post('/auth/sign-in').send(admin).expect(200);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.user.role).toBe('admin');
  });

  it('accepts a placeholder in production once the admin has another password', async () => {
    await seedAdmin({
      admin: { email: config.admin.email, password: 'a-long-production-password' },
      nodeEnv: 'production',
    });
    const { exit } = mockExit();
    try {
      await expect(
        seedAdmin({ admin: config.admin, nodeEnv: 'production' }),
      ).resolves.toBeUndefined();
      expect(exit).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('ends the process in production while an admin still has a placeholder password', async () => {
    // created by an older version, which did not check the password
    await seedAdmin({ admin: config.admin, nodeEnv: 'test' });
    const { exit, fatal } = mockExit();
    try {
      const settings = { admin: config.admin, nodeEnv: 'production' as const };
      await expect(seedAdmin(settings)).rejects.toThrow('process.exit');

      expect(exit).toHaveBeenCalledWith(1);
      expect(fatal).toHaveBeenCalledWith(expect.stringContaining(config.admin.email));
      expect(fatal).not.toHaveBeenCalledWith(expect.stringContaining(config.admin.password));
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('replaces the placeholder password of an admin with a strong configured one in production', async () => {
    const old = await adminAgent();
    const admin = { email: config.admin.email, password: 'a-long-production-password' };
    await seedAdmin({ admin, nodeEnv: 'production' });

    await old.get('/admin/users').expect(401);
    await request(app).post('/auth/sign-in').send(config.admin).expect(401);
    await request(app).post('/auth/sign-in').send(admin).expect(200);
  });

  it('does not promote an existing account with the admin email', async () => {
    const agent = await signedUpAgent(config.admin.email);
    await seedAdmin();

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.user.role).toBe('user');
  });

  it('is closed to everyone but admins', async () => {
    const user = await signedUpAgent('ada@example.com');
    const id = await idOf(user);

    for (const client of [request(app), user]) {
      const status = client === user ? 403 : 401;
      await client.get('/admin/users').expect(status);
      await client.patch(`/admin/users/${id}`).send({ role: 'admin' }).expect(status);
      await client.delete(`/admin/users/${id}`).expect(status);
      await client.delete(`/admin/users/${id}/sessions`).expect(status);
    }
  });

  it('lists all users without their password hashes', async () => {
    const admin = await adminAgent();
    await signedUpAgent('ada@example.com');

    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users.map((user: { email: string }) => user.email)).toEqual([
      config.admin.email,
      'ada@example.com',
    ]);
    expect(list.body.users[1]).toMatchObject({ role: 'user' });
    expect(list.body.users[1]).not.toHaveProperty('passwordHash');
  });

  it('grants and removes admin rights, effective on the next request', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const id = await idOf(user);

    const promoted = await admin.patch(`/admin/users/${id}`).send({ role: 'admin' }).expect(200);
    expect(promoted.body.user).toMatchObject({ id, role: 'admin' });
    await user.get('/admin/users').expect(200);

    await admin.patch(`/admin/users/${id}`).send({ role: 'user' }).expect(200);
    await user.get('/admin/users').expect(403);
  });

  it('rejects changes to the own account', async () => {
    const admin = await adminAgent();
    const id = await idOf(admin);

    await admin.patch(`/admin/users/${id}`).send({ role: 'user' }).expect(409);
    await admin.delete(`/admin/users/${id}`).expect(409);
    await admin.get('/admin/users').expect(200);
  });

  it('rejects unknown users and invalid input', async () => {
    const admin = await adminAgent();

    await admin.patch(`/admin/users/${UNKNOWN_ID}`).send({ role: 'admin' }).expect(404);
    await admin.delete(`/admin/users/${UNKNOWN_ID}`).expect(404);
    await admin.delete(`/admin/users/${UNKNOWN_ID}/sessions`).expect(404);

    await admin.patch(`/admin/users/${UNKNOWN_ID}`).send({ role: 'owner' }).expect(400);
    await admin.delete('/admin/users/not-a-uuid').expect(400);
  });

  it('deletes a user with their sessions', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const id = await idOf(user);

    await admin.delete(`/admin/users/${id}`).expect(204);

    await user.get('/auth/me').expect(401);
    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users).toHaveLength(1);

    // the email is free again
    await signedUpAgent('ada@example.com');
  });

  it('runs the cleanup of features after the user is deleted', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const id = await idOf(user);
    const steps: string[] = [];
    const remove = onUserDeleted(async (userId) => {
      steps.push(`before ${userId === id}`);
      return async () => {
        steps.push('after');
      };
    });

    await admin.delete(`/admin/users/${id}`).expect(204);

    remove();
    expect(steps).toEqual(['before true', 'after']);
  });

  it('revokes all sessions of a user, who can sign in again', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const other = await signedUpAgent('grace@example.com');
    const id = await idOf(user);

    await admin.delete(`/admin/users/${id}/sessions`).expect(204);

    await user.get('/auth/me').expect(401);
    await other.get('/auth/me').expect(200);
    await admin.get('/auth/me').expect(200);
    await user
      .post('/auth/sign-in')
      .send({ email: 'ada@example.com', password: 'correct-horse' })
      .expect(200);
  });
});
