import { config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { redactTokens, serializeRequest } from '@server/core/logger';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { accountInvites } from './account-invites.table';
import { resetAuthTables } from './testing/helpers';
import { adminAgent, app, signedUpAgent } from './testing/test-app';
import { users } from './users.table';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const DAY = 24 * 60 * 60 * 1000;
const credentials = { email: 'Ada@Example.com', password: 'correct-horse' };

type Agent = Awaited<ReturnType<typeof adminAgent>>;

async function createInvite(admin: Agent, name = 'Ada Lovelace') {
  const res = await admin.post('/admin/account-invites').send({ name }).expect(201);
  return res.body.invite as { id: string; name: string; token: string; expiresAt: string };
}

describe('account links: admin', () => {
  it('creates a link with a 43 character token that lasts 7 days', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/admin/account-invites').send({ name: '  Ada  ' }).expect(201);

    expect(Object.keys(res.body.invite).sort()).toEqual([
      'createdAt',
      'expiresAt',
      'id',
      'name',
      'token',
    ]);
    expect(res.body.invite.name).toBe('Ada');
    expect(res.body.invite.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const ahead = new Date(res.body.invite.expiresAt).getTime() - Date.now();
    expect(Math.abs(ahead - 7 * DAY)).toBeLessThan(60_000);
  });

  it('lists only open links', async () => {
    const admin = await adminAgent();
    const open = await createInvite(admin, 'Open');
    const expired = await createInvite(admin, 'Expired');
    const used = await createInvite(admin, 'Used');
    await db
      .update(accountInvites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(accountInvites.id, expired.id));
    await request(app).post(`/auth/account-invites/${used.token}`).send(credentials).expect(201);

    const list = await admin.get('/admin/account-invites').expect(200);
    expect(list.body.invites.map((i: { id: string }) => i.id)).toEqual([open.id]);
    expect(list.body.invites[0].token).toBe(open.token);
  });

  it('revokes an open link once', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);

    await admin.delete(`/admin/account-invites/${invite.id}`).expect(204);
    await admin.delete(`/admin/account-invites/${invite.id}`).expect(404);
    await request(app).get(`/auth/account-invites/${invite.token}`).expect(404);
    expect((await admin.get('/admin/account-invites')).body.invites).toEqual([]);
  });

  it('does not revoke a used link', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);
    await request(app).post(`/auth/account-invites/${invite.token}`).send(credentials).expect(201);

    await admin.delete(`/admin/account-invites/${invite.id}`).expect(404);
    const rows = await db.select().from(accountInvites);
    expect(rows).toHaveLength(1);
  });

  it('answers 404 for an unknown id and 400 for a malformed one', async () => {
    const admin = await adminAgent();
    await admin.delete(`/admin/account-invites/${UNKNOWN_ID}`).expect(404);
    await admin.delete('/admin/account-invites/not-a-uuid').expect(400);
  });

  it('is closed to everyone but admins: 401 without session, 403 for a user', async () => {
    const user = await signedUpAgent('ada@example.com');

    for (const client of [request(app), user]) {
      const status = client === user ? 403 : 401;
      await client.get('/admin/account-invites').expect(status);
      await client.post('/admin/account-invites').send({ name: 'Grace' }).expect(status);
      await client.delete(`/admin/account-invites/${UNKNOWN_ID}`).expect(status);
    }
  });

  it('rejects invalid names with 400 and details', async () => {
    const admin = await adminAgent();
    for (const body of [{ name: '' }, { name: '   ' }, {}, { name: 'x'.repeat(101) }]) {
      const res = await admin.post('/admin/account-invites').send(body).expect(400);
      expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['name']);
    }
  });

  it('keeps the link when the admin who created it is deleted', async () => {
    const admin = await adminAgent();
    const me = await admin.get('/auth/me').expect(200);
    const invite = await createInvite(admin);

    // delete the creator directly, an admin cannot delete themselves
    await db.delete(users).where(eq(users.id, me.body.user.id));

    const [row] = await db.select().from(accountInvites).where(eq(accountInvites.id, invite.id));
    expect(row).toBeDefined();
    expect(row!.createdBy).toBeNull();
    await request(app).get(`/auth/account-invites/${invite.token}`).expect(200);
  });

  it('is cleared by resetAuthTables', async () => {
    const admin = await adminAgent();
    await createInvite(admin);
    await resetAuthTables();
    expect(await db.select().from(accountInvites)).toHaveLength(0);
  });
});

describe('account links: public', () => {
  it('shows the name of an open link', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin, 'Ada Lovelace');

    const res = await request(app).get(`/auth/account-invites/${invite.token}`).expect(200);
    expect(res.body).toEqual({ invite: { name: 'Ada Lovelace' } });
  });

  it('answers unknown, malformed, used, expired and revoked tokens with the same 404', async () => {
    const admin = await adminAgent();
    const used = await createInvite(admin);
    const expired = await createInvite(admin);
    const revoked = await createInvite(admin);
    await request(app).post(`/auth/account-invites/${used.token}`).send(credentials).expect(201);
    await db
      .update(accountInvites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(accountInvites.id, expired.id));
    await admin.delete(`/admin/account-invites/${revoked.id}`).expect(204);

    const tokens = [
      'A'.repeat(43),
      'abc',
      `${'A'.repeat(42)}!`,
      used.token,
      expired.token,
      revoked.token,
    ];
    const bodies = [];
    for (const token of tokens) {
      const get = await request(app).get(`/auth/account-invites/${token}`).expect(404);
      const post = await request(app)
        .post(`/auth/account-invites/${token}`)
        .send({ email: 'new@example.com', password: 'correct-horse' })
        .expect(404);
      bodies.push(get.body, post.body);
    }
    for (const body of bodies) expect(body).toEqual(bodies[0]);
    expect(bodies[0].error.message).toBeDefined();
  });
});

describe('account links: accept', () => {
  it('creates the account and signs in', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);
    const agent = request.agent(app);

    const res = await agent
      .post(`/auth/account-invites/${invite.token}`)
      .send(credentials)
      .expect(201);
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', role: 'user' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.user.email).toBe('ada@example.com');
  });

  it('takes the name of the link unless one is sent', async () => {
    const admin = await adminAgent();
    const first = await createInvite(admin, 'Link Name');
    const second = await createInvite(admin, 'Link Name');

    const defaulted = await request(app)
      .post(`/auth/account-invites/${first.token}`)
      .send({ email: 'a@example.com', password: 'correct-horse' })
      .expect(201);
    expect(defaulted.body.user.name).toBe('Link Name');

    const given = await request(app)
      .post(`/auth/account-invites/${second.token}`)
      .send({ email: 'b@example.com', password: 'correct-horse', name: 'Own Name' })
      .expect(201);
    expect(given.body.user.name).toBe('Own Name');
  });

  it('works while sign-up is disabled', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);
    config.auth.signUpEnabled = false;
    try {
      await request(app).post('/auth/sign-up').send(credentials).expect(403);
      await request(app)
        .post(`/auth/account-invites/${invite.token}`)
        .send(credentials)
        .expect(201);
    } finally {
      config.auth.signUpEnabled = true;
    }
  });

  it('uses the link up', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);
    await request(app).post(`/auth/account-invites/${invite.token}`).send(credentials).expect(201);

    await request(app).get(`/auth/account-invites/${invite.token}`).expect(404);
    await request(app)
      .post(`/auth/account-invites/${invite.token}`)
      .send({ email: 'other@example.com', password: 'correct-horse' })
      .expect(404);
  });

  it('records who used the link', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);
    const res = await request(app)
      .post(`/auth/account-invites/${invite.token}`)
      .send(credentials)
      .expect(201);

    const [row] = await db.select().from(accountInvites).where(eq(accountInvites.id, invite.id));
    expect(row!.usedBy).toBe(res.body.user.id);
    expect(row!.usedAt).toBeInstanceOf(Date);
  });

  it('answers 409 for a taken email and leaves the link open', async () => {
    const admin = await adminAgent();
    await signedUpAgent('ada@example.com');
    const invite = await createInvite(admin);

    await request(app).post(`/auth/account-invites/${invite.token}`).send(credentials).expect(409);

    await request(app).get(`/auth/account-invites/${invite.token}`).expect(200);
    await request(app)
      .post(`/auth/account-invites/${invite.token}`)
      .send({ email: 'free@example.com', password: 'correct-horse' })
      .expect(201);
  });

  it('rejects invalid input with 400 and leaves the link open', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);

    const res = await request(app)
      .post(`/auth/account-invites/${invite.token}`)
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual([
      'email',
      'password',
    ]);
    await request(app).get(`/auth/account-invites/${invite.token}`).expect(200);
  });

  it('creates one account when two requests use the same link', async () => {
    const admin = await adminAgent();
    const invite = await createInvite(admin);

    const results = await Promise.all(
      ['a@example.com', 'b@example.com'].map((email) =>
        request(app)
          .post(`/auth/account-invites/${invite.token}`)
          .send({ email, password: 'correct-horse' }),
      ),
    );

    expect(results.map((r) => r.status).sort()).toEqual([201, 404]);
    const users = await admin.get('/admin/users').expect(200);
    expect(users.body.users).toHaveLength(2); // admin + one new account
  });
});

describe('redactTokens', () => {
  const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0-_U';

  it('has the test token at 43 characters', () => {
    expect(token).toHaveLength(43);
  });

  it('masks a token segment, with or without query', () => {
    expect(redactTokens(`/auth/account-invites/${token}`)).toBe('/auth/account-invites/[token]');
    expect(redactTokens(`/api/v1/auth/account-invites/${token}?a=1`)).toBe(
      '/api/v1/auth/account-invites/[token]?a=1',
    );
    expect(redactTokens(`/auth/account-invites/${token}/x`)).toBe(
      '/auth/account-invites/[token]/x',
    );
  });

  it('leaves uuids and short segments unchanged', () => {
    for (const url of [
      `/admin/account-invites/${UNKNOWN_ID}`,
      `/api/v1/events/${UNKNOWN_ID}/guests/${UNKNOWN_ID}/response`,
      '/auth/account-invites/abc',
      '/auth/me',
      `/auth/account-invites/${token.slice(0, 42)}`,
    ]) {
      expect(redactTokens(url)).toBe(url);
    }
  });

  it('masks a segment longer than a token', () => {
    expect(redactTokens(`/auth/account-invites/${token}x`)).toBe('/auth/account-invites/[token]');
  });

  it('masks a token with something stuck to it', () => {
    expect(redactTokens(`/rsvp/${token}.`)).toBe('/rsvp/[token].');
    expect(redactTokens(`/rsvp/${token})`)).toBe('/rsvp/[token])');
  });

  it('masks a percent-encoded token', () => {
    const encoded = `%41${token.slice(1)}`;
    expect(redactTokens(`/rsvp/${encoded}`)).toBe('/rsvp/[token]');
    expect(redactTokens(`/rsvp/${encoded}?a=1`)).toBe('/rsvp/[token]?a=1');
  });

  it('leaves a malformed percent sequence as it is, without throwing', () => {
    expect(redactTokens('/rsvp/%E0%A4%A')).toBe('/rsvp/%E0%A4%A');
    expect(redactTokens('/rsvp/100%')).toBe('/rsvp/100%');
  });
});

describe('serializeRequest', () => {
  const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0-_U';

  it('masks the url and string params and keeps the rest', () => {
    const out = serializeRequest({
      method: 'GET',
      url: `/auth/account-invites/${token}?x=1`,
      params: { token, id: UNKNOWN_ID, count: 3 },
    });
    expect(out).toEqual({
      method: 'GET',
      url: '/auth/account-invites/[token]?x=1',
      params: { token: '[token]', id: UNKNOWN_ID, count: 3 },
    });
  });

  it('copes with a request without url or params', () => {
    expect(serializeRequest({ method: 'GET' })).toMatchObject({ method: 'GET' });
  });
});
