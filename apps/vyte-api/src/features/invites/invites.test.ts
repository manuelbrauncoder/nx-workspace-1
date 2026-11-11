import { users } from '@server/auth/users.table';
import { config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { EVENT_EDITORS_MAX } from '@vyte/contracts/events-limits';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiPrefix } from '../../shared/api.js';
import { app, signedUpAgent } from '../../test/helpers.js';
import { eventMembers, events } from '../events/events.table.js';
import { editorInvites } from '../team/team.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const invites = `${apiPrefix}/invites`;
const day = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();

async function createEvent(agent: Agent) {
  const res = await agent
    .post(base)
    .send({ title: 'Summer party', startsAt: inDays(10), timeZone: 'Europe/Berlin' })
    .expect(201);
  return res.body.event as { id: string };
}

async function userId(agent: Agent) {
  return (await agent.get(`${apiPrefix}/auth/me`).expect(200)).body.user.id as string;
}

async function namedAgent(email: string, name: string) {
  const agent = request.agent(app);
  await agent
    .post(`${apiPrefix}/auth/sign-up`)
    .send({ email, password: 'correct-horse', name })
    .expect(201);
  return agent;
}

async function createInvite(agent: Agent, eventId: string) {
  const res = await agent.post(`${base}/${eventId}/invites`).expect(201);
  return res.body.invite as { id: string; token: string };
}

async function makePast(eventId: string) {
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - 5 * day), endsAt: null })
    .where(eq(events.id, eventId));
}

async function memberRows(eventId: string) {
  return db.select().from(eventMembers).where(eq(eventMembers.eventId, eventId));
}

const signUpBody = { email: 'new@example.com', password: 'correct-horse', name: 'Newbie' };

/** Owner Ada with an event and one open invite. */
async function setup() {
  const ada = await namedAgent('ada@example.com', 'Ada');
  const event = await createEvent(ada);
  const invite = await createInvite(ada, event.id);
  return { ada, event, invite };
}

/** The ways a link can be dead; each yields a token that must answer the same 404. */
async function deadTokens() {
  const { ada, event, invite: unused } = await setup();
  const expired = await createInvite(ada, event.id);
  await db
    .update(editorInvites)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(editorInvites.id, expired.id));
  const used = await createInvite(ada, event.id);
  await db.update(editorInvites).set({ usedAt: new Date() }).where(eq(editorInvites.id, used.id));
  const revoked = await createInvite(ada, event.id);
  await ada.delete(`${base}/${event.id}/invites/${revoked.id}`).expect(204);

  const pastEvent = await createEvent(ada);
  const past = await createInvite(ada, pastEvent.id);
  await makePast(pastEvent.id);

  return {
    unused,
    dead: {
      unknown: 'A'.repeat(43),
      malformed: 'short',
      expired: expired.token,
      used: used.token,
      revoked: revoked.token,
      'of a past event': past.token,
    },
  };
}

describe('invites', () => {
  describe('GET /invites/:token', () => {
    it('shows the event and the owner name without a session, with no-store', async () => {
      const { invite } = await setup();
      const res = await request(app).get(`${invites}/${invite.token}`).expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body).toEqual({
        invite: {
          eventTitle: 'Summer party',
          startsAt: expect.any(String),
          allDay: false,
          timeZone: 'Europe/Berlin',
          ownerName: 'Ada',
        },
      });
    });

    it('never shows an email, and has no owner name if none is set', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const invite = await createInvite(ada, event.id);
      const res = await request(app).get(`${invites}/${invite.token}`).expect(200);
      expect(res.body.invite.ownerName).toBeNull();
      expect(JSON.stringify(res.body)).not.toContain('ada@example.com');
      expect(JSON.stringify(res.body)).not.toContain('@');
    });

    it('does not use the link up', async () => {
      const { invite } = await setup();
      await request(app).get(`${invites}/${invite.token}`).expect(200);
      await request(app).get(`${invites}/${invite.token}`).expect(200);
    });

    it('answers the same 404 for every kind of dead link', async () => {
      const { dead } = await deadTokens();
      const bodies = [];
      for (const [kind, token] of Object.entries(dead)) {
        const res = await request(app).get(`${invites}/${token}`);
        expect([kind, res.status]).toEqual([kind, 404]);
        bodies.push(res.body);
      }
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
      expect(bodies[0]).toEqual({ error: { message: expect.any(String) } });
    });
  });

  describe('POST /invites/:token/accept', () => {
    it('makes the user an editor, uses up the link and answers the event as editor', async () => {
      const { invite, event } = await setup();
      const grace = await signedUpAgent('grace@example.com');
      const res = await grace.post(`${invites}/${invite.token}/accept`).expect(200);

      expect(res.body.event).toMatchObject({ id: event.id, title: 'Summer party', role: 'editor' });
      await grace.get(`${base}/${event.id}`).expect(200);

      const [row] = await db.select().from(editorInvites).where(eq(editorInvites.id, invite.id));
      expect(row!.usedAt).not.toBeNull();
      expect(row!.usedBy).toBe(await userId(grace));

      const rows = await memberRows(event.id);
      expect(rows.map((r) => r.role).sort()).toEqual(['editor', 'owner']);
    });

    it('works once: the second try is 404', async () => {
      const { invite } = await setup();
      const grace = await signedUpAgent('grace@example.com');
      const alan = await signedUpAgent('alan@example.com');
      await grace.post(`${invites}/${invite.token}/accept`).expect(200);
      await alan.post(`${invites}/${invite.token}/accept`).expect(404);
      await request(app).get(`${invites}/${invite.token}`).expect(404);
    });

    it('gives the editor who used the link the event again, and others still 404', async () => {
      const { invite, event } = await setup();
      const grace = await signedUpAgent('grace@example.com');
      const alan = await signedUpAgent('alan@example.com');
      await grace.post(`${invites}/${invite.token}/accept`).expect(200);

      const again = await grace.post(`${invites}/${invite.token}/accept`).expect(200);
      expect(again.body.event).toMatchObject({ id: event.id, role: 'editor' });
      await alan.post(`${invites}/${invite.token}/accept`).expect(404);
      expect((await memberRows(event.id)).filter((m) => m.role === 'editor')).toHaveLength(1);
    });

    it('answers 404 when the editor who used the link has left', async () => {
      const { invite, event } = await setup();
      const grace = await signedUpAgent('grace@example.com');
      await grace.post(`${invites}/${invite.token}/accept`).expect(200);
      await grace.delete(`${base}/${event.id}/members/${await userId(grace)}`).expect(204);

      await grace.post(`${invites}/${invite.token}/accept`).expect(404);
      await grace.get(`${base}/${event.id}`).expect(404);
    });

    it('gives a member the event and leaves the link open', async () => {
      const { ada, invite, event } = await setup();
      const res = await ada.post(`${invites}/${invite.token}/accept`).expect(200);
      expect(res.body.event).toMatchObject({ id: event.id, role: 'owner' });

      expect(await memberRows(event.id)).toHaveLength(1);
      const [row] = await db.select().from(editorInvites).where(eq(editorInvites.id, invite.id));
      expect(row!.usedAt).toBeNull();
      await request(app).get(`${invites}/${invite.token}`).expect(200);
    });

    it('answers 401 without a session and keeps the link open', async () => {
      const { invite } = await setup();
      await request(app).post(`${invites}/${invite.token}/accept`).expect(401);
      await request(app).get(`${invites}/${invite.token}`).expect(200);
    });

    it('answers the same 404 for every kind of dead link', async () => {
      const { dead } = await deadTokens();
      const grace = await signedUpAgent('grace@example.com');
      const bodies = [];
      for (const [kind, token] of Object.entries(dead)) {
        const res = await grace.post(`${invites}/${token}/accept`);
        expect([kind, res.status]).toEqual([kind, 404]);
        bodies.push(res.body);
      }
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    });

    it('lets two users with the same link make exactly one editor', async () => {
      const { invite, event } = await setup();
      const grace = await signedUpAgent('grace@example.com');
      const alan = await signedUpAgent('alan@example.com');

      const results = await Promise.all([
        grace.post(`${invites}/${invite.token}/accept`),
        alan.post(`${invites}/${invite.token}/accept`),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
      const rows = await memberRows(event.id);
      expect(rows.filter((r) => r.role === 'editor')).toHaveLength(1);
    });

    it('allows 10 editors and answers 409 for the 11th, leaving the link open', async () => {
      const { ada, event } = await setup();
      const rows = [];
      for (let i = 0; i < EVENT_EDITORS_MAX - 1; i++) {
        const editor = await signedUpAgent(`editor${i}@example.com`);
        rows.push({ eventId: event.id, userId: await userId(editor), role: 'editor' as const });
      }
      await db.insert(eventMembers).values(rows);

      const first = await createInvite(ada, event.id);
      const second = await createInvite(ada, event.id);
      const grace = await signedUpAgent('grace@example.com');
      const alan = await signedUpAgent('alan@example.com');

      await grace.post(`${invites}/${first.token}/accept`).expect(200);
      await alan.post(`${invites}/${second.token}/accept`).expect(409);

      const members = await memberRows(event.id);
      expect(members.filter((m) => m.role === 'editor')).toHaveLength(EVENT_EDITORS_MAX);
      const [row] = await db.select().from(editorInvites).where(eq(editorInvites.id, second.id));
      expect(row!.usedAt).toBeNull();
    });

    it('makes room again after an editor leaves', async () => {
      const { ada, event } = await setup();
      const editors: Agent[] = [];
      for (let i = 0; i < EVENT_EDITORS_MAX; i++) {
        const editor = await signedUpAgent(`editor${i}@example.com`);
        await db
          .insert(eventMembers)
          .values({ eventId: event.id, userId: await userId(editor), role: 'editor' });
        editors.push(editor);
      }
      const invite = await createInvite(ada, event.id);
      const grace = await signedUpAgent('grace@example.com');
      await grace.post(`${invites}/${invite.token}/accept`).expect(409);

      await editors[0]!
        .delete(`${base}/${event.id}/members/${await userId(editors[0]!)}`)
        .expect(204);
      await grace.post(`${invites}/${invite.token}/accept`).expect(200);
    });
  });

  describe('POST /invites/:token/sign-up', () => {
    it('creates the account, makes it editor, signs in and answers 201 with the event', async () => {
      const { invite, event } = await setup();
      const agent = request.agent(app);
      const res = await agent
        .post(`${invites}/${invite.token}/sign-up`)
        .send(signUpBody)
        .expect(201);
      expect(res.body.event).toMatchObject({ id: event.id, role: 'editor' });

      // signed in through the cookie
      const me = await agent.get(`${apiPrefix}/auth/me`).expect(200);
      expect(me.body.user).toMatchObject({
        email: 'new@example.com',
        name: 'Newbie',
        role: 'user',
      });
      await agent.get(`${base}/${event.id}`).expect(200);

      const [row] = await db.select().from(editorInvites).where(eq(editorInvites.id, invite.id));
      expect(row!.usedBy).toBe(me.body.user.id);
      await request(app).get(`${invites}/${invite.token}`).expect(404);
    });

    it('works without a name', async () => {
      const { invite } = await setup();
      const res = await request(app)
        .post(`${invites}/${invite.token}/sign-up`)
        .send({ email: 'new@example.com', password: 'correct-horse' })
        .expect(201);
      expect(res.body.event.role).toBe('editor');
    });

    it('works while sign-up is closed, which stays closed otherwise', async () => {
      const { invite, event } = await setup();
      config.auth.signUpEnabled = false;
      try {
        await request(app)
          .post(`${apiPrefix}/auth/sign-up`)
          .send({ email: 'other@example.com', password: 'correct-horse' })
          .expect(403);
        const res = await request(app)
          .post(`${invites}/${invite.token}/sign-up`)
          .send(signUpBody)
          .expect(201);
        expect(res.body.event.id).toBe(event.id);
      } finally {
        config.auth.signUpEnabled = true;
      }
    });

    it('answers 400 with details for bad input and keeps the link open', async () => {
      const { invite } = await setup();
      const send = (body: object) =>
        request(app).post(`${invites}/${invite.token}/sign-up`).send(body);
      const paths = (res: request.Response) =>
        res.body.error.details.map((d: { path: string }) => d.path);

      expect(paths(await send({}).expect(400))).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
      expect(paths(await send({ ...signUpBody, email: 'nope' }).expect(400))).toContain('email');
      expect(paths(await send({ ...signUpBody, password: 'short' }).expect(400))).toContain(
        'password',
      );
      expect(paths(await send({ ...signUpBody, name: 'x'.repeat(101) }).expect(400))).toContain(
        'name',
      );
      await request(app).get(`${invites}/${invite.token}`).expect(200);
    });

    it('answers 409 for a taken email and keeps the link open', async () => {
      const { invite, event } = await setup();
      const res = await request(app)
        .post(`${invites}/${invite.token}/sign-up`)
        .send({ ...signUpBody, email: 'ada@example.com' })
        .expect(409);
      expect(res.headers['set-cookie']).toBeUndefined();

      expect(await memberRows(event.id)).toHaveLength(1);
      const [row] = await db.select().from(editorInvites).where(eq(editorInvites.id, invite.id));
      expect(row!.usedAt).toBeNull();
      await request(app).post(`${invites}/${invite.token}/sign-up`).send(signUpBody).expect(201);
    });

    it('answers the same 404 for every kind of dead link and creates no account', async () => {
      const { dead } = await deadTokens();
      const before = await db.select({ id: users.id }).from(users);
      const bodies = [];
      for (const [kind, token] of Object.entries(dead)) {
        const res = await request(app).post(`${invites}/${token}/sign-up`).send(signUpBody);
        expect([kind, res.status]).toEqual([kind, 404]);
        bodies.push(res.body);
      }
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
      expect(await db.select({ id: users.id }).from(users)).toHaveLength(before.length);
    });

    it('gives a dead link the same 404 body on all three routes', async () => {
      const { dead } = await deadTokens();
      const grace = await signedUpAgent('grace@example.com');
      const token = dead.used;
      const bodies = [
        (await request(app).get(`${invites}/${token}`).expect(404)).body,
        (await grace.post(`${invites}/${token}/accept`).expect(404)).body,
        (await request(app).post(`${invites}/${token}/sign-up`).send(signUpBody).expect(404)).body,
      ];
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    });

    it('makes one account when two people sign up with the same link', async () => {
      const { invite, event } = await setup();
      const results = await Promise.all([
        request(app)
          .post(`${invites}/${invite.token}/sign-up`)
          .send({ email: 'one@example.com', password: 'correct-horse' }),
        request(app)
          .post(`${invites}/${invite.token}/sign-up`)
          .send({ email: 'two@example.com', password: 'correct-horse' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 404]);

      const created = (await db.select({ email: users.email }).from(users)).filter((u) =>
        ['one@example.com', 'two@example.com'].includes(u.email),
      );
      expect(created).toHaveLength(1);
      const editors = await db
        .select()
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, event.id), eq(eventMembers.role, 'editor')));
      expect(editors).toHaveLength(1);
    });

    it('answers 409 at 10 editors and creates no account', async () => {
      const { ada, event } = await setup();
      const rows = [];
      for (let i = 0; i < EVENT_EDITORS_MAX; i++) {
        const editor = await signedUpAgent(`editor${i}@example.com`);
        rows.push({ eventId: event.id, userId: await userId(editor), role: 'editor' as const });
      }
      await db.insert(eventMembers).values(rows);
      const invite = await createInvite(ada, event.id);

      await request(app).post(`${invites}/${invite.token}/sign-up`).send(signUpBody).expect(409);
      const found = await db.select().from(users).where(eq(users.email, 'new@example.com'));
      expect(found).toHaveLength(0);
    });
  });
});
