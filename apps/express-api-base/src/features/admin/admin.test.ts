import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { seedAdmin } from './admin.seed.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

async function idOf(agent: Awaited<ReturnType<typeof signedUpAgent>>): Promise<string> {
  const me = await agent.get('/auth/me').expect(200);
  return me.body.user.id;
}

describe('admin', () => {
  it('seeds the configured admin only once', async () => {
    await seedAdmin();
    const admin = await adminAgent();

    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users).toHaveLength(1);
    expect(list.body.users[0]).toMatchObject({ email: config.admin.email, role: 'admin' });
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

  it('deletes a user with their sessions, notes and image files', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const id = await idOf(user);

    const note = await user.post('/notes').send({ title: 'Note' }).expect(201);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    await user.post(`/notes/${note.body.note.id}/images`).attach('images', png, 'a.png');
    expect(await readdir(config.uploads.dir)).toHaveLength(1);

    await admin.delete(`/admin/users/${id}`).expect(204);

    await user.get('/auth/me').expect(401);
    expect(await readdir(config.uploads.dir)).toHaveLength(0);
    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users).toHaveLength(1);

    // the email is free again, and the new account starts empty
    const again = await signedUpAgent('ada@example.com');
    const notes = await again.get('/notes').expect(200);
    expect(notes.body.notes).toHaveLength(0);
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
