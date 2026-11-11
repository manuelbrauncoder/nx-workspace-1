import { db } from '@server/core/db/db';
import { editorInviteSchema, memberSchema } from '@vyte/contracts/team';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiPrefix } from '../../shared/api.js';
import { app, signedUpAgent } from '../../test/helpers.js';
import { eventMembers, events } from '../events/events.table.js';
import { editorInvites } from './team.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const day = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();
const unknownId = '00000000-0000-4000-8000-000000000000';

async function createEvent(agent: Agent, extra: Record<string, unknown> = {}) {
  const res = await agent
    .post(base)
    .send({ title: 'Summer party', startsAt: inDays(10), timeZone: 'Europe/Berlin', ...extra })
    .expect(201);
  return res.body.event as { id: string };
}

async function userId(agent: Agent) {
  return (await agent.get(`${apiPrefix}/auth/me`).expect(200)).body.user.id as string;
}

async function addEditor(eventId: string, editor: Agent) {
  await db.insert(eventMembers).values({ eventId, userId: await userId(editor), role: 'editor' });
}

async function makePast(eventId: string) {
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - 5 * day), endsAt: null })
    .where(eq(events.id, eventId));
}

async function namedAgent(email: string, name: string) {
  const agent = request.agent(app);
  await agent
    .post(`${apiPrefix}/auth/sign-up`)
    .send({ email, password: 'correct-horse', name })
    .expect(201);
  return agent;
}

/** The id is awaited before the request exists, so supertest does not start it too early. */
async function putOwner(
  agent: Agent,
  eventId: string,
  target: Promise<string> | string,
  status: number,
) {
  const id = await target;
  return agent.put(`${base}/${eventId}/owner`).send({ userId: id }).expect(status);
}

async function createInvite(agent: Agent, eventId: string) {
  const res = await agent.post(`${base}/${eventId}/invites`).expect(201);
  return res.body.invite as { id: string; token: string; expiresAt: string; createdAt: string };
}

/** Owner Ada, editor Grace, outsider Linus. */
async function setup() {
  const ada = await namedAgent('ada@example.com', 'Ada');
  const grace = await signedUpAgent('grace@example.com');
  const linus = await signedUpAgent('linus@example.com');
  const event = await createEvent(ada);
  await addEditor(event.id, grace);
  return { ada, grace, linus, event };
}

describe('team', () => {
  describe('GET /events/:id/members', () => {
    it('lists the owner first, then the editors by join time, with the full shape', async () => {
      const ada = await namedAgent('ada@example.com', 'Ada');
      const grace = await signedUpAgent('grace@example.com');
      const alan = await signedUpAgent('alan@example.com');
      const event = await createEvent(ada);
      await addEditor(event.id, alan);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await addEditor(event.id, grace);

      const res = await ada.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body).toEqual({
        members: [
          {
            userId: await userId(ada),
            name: 'Ada',
            email: 'ada@example.com',
            role: 'owner',
            joinedAt: expect.any(String),
          },
          {
            userId: await userId(alan),
            name: null,
            email: 'alan@example.com',
            role: 'editor',
            joinedAt: expect.any(String),
          },
          {
            userId: await userId(grace),
            name: null,
            email: 'grace@example.com',
            role: 'editor',
            joinedAt: expect.any(String),
          },
        ],
      });
      for (const member of res.body.members) {
        expect(memberSchema.strict().safeParse(member).error).toBeUndefined();
      }
    });

    it('is open to an editor too', async () => {
      const { grace, event } = await setup();
      const res = await grace.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body.members).toHaveLength(2);
    });

    it('answers 401 without a session', async () => {
      const { event } = await setup();
      await request(app).get(`${base}/${event.id}/members`).expect(401);
    });

    it('answers 404 to a non-member and for an unknown event', async () => {
      const { linus, event } = await setup();
      await linus.get(`${base}/${event.id}/members`).expect(404);
      await linus.get(`${base}/${unknownId}/members`).expect(404);
    });

    it('answers 400 for an id that is no uuid', async () => {
      const { ada } = await setup();
      await ada.get(`${base}/nope/members`).expect(400);
    });

    it('never shows the members of another event', async () => {
      const { ada, event } = await setup();
      const other = await signedUpAgent('other@example.com');
      const otherEvent = await createEvent(other);

      const mine = await ada.get(`${base}/${event.id}/members`).expect(200);
      const theirs = await other.get(`${base}/${otherEvent.id}/members`).expect(200);
      expect(mine.body.members.map((m: { email: string }) => m.email)).toEqual([
        'ada@example.com',
        'grace@example.com',
      ]);
      expect(theirs.body.members.map((m: { email: string }) => m.email)).toEqual([
        'other@example.com',
      ]);
    });
  });

  describe('DELETE /events/:id/members/:userId', () => {
    it('lets the owner remove an editor', async () => {
      const { ada, grace, event } = await setup();
      await ada.delete(`${base}/${event.id}/members/${await userId(grace)}`).expect(204);

      const res = await ada.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body.members).toHaveLength(1);
      await grace.get(`${base}/${event.id}`).expect(404);
    });

    it('lets an editor leave', async () => {
      const { ada, grace, event } = await setup();
      await grace.delete(`${base}/${event.id}/members/${await userId(grace)}`).expect(204);

      // an editor who left loses access
      await grace.get(`${base}/${event.id}`).expect(404);
      await grace.get(`${base}/${event.id}/members`).expect(404);
      const res = await ada.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body.members).toHaveLength(1);
    });

    it('lets an editor leave after the event', async () => {
      const { grace, event } = await setup();
      await makePast(event.id);
      await grace.delete(`${base}/${event.id}/members/${await userId(grace)}`).expect(204);
      await grace.get(`${base}/${event.id}`).expect(404);
    });

    it('answers 403 when an editor removes someone else', async () => {
      const { ada, grace, event } = await setup();
      const alan = await signedUpAgent('alan@example.com');
      await addEditor(event.id, alan);

      await grace.delete(`${base}/${event.id}/members/${await userId(alan)}`).expect(403);
      await grace.delete(`${base}/${event.id}/members/${await userId(ada)}`).expect(403);
      const res = await ada.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body.members).toHaveLength(3);
    });

    it('answers 409 when the owner is removed or leaves', async () => {
      const { ada, event } = await setup();
      await ada.delete(`${base}/${event.id}/members/${await userId(ada)}`).expect(409);
      const res = await ada.get(`${base}/${event.id}/members`).expect(200);
      expect(res.body.members[0].role).toBe('owner');
    });

    it('answers 409 when the owner removes someone on a past event', async () => {
      const { ada, grace, event } = await setup();
      await makePast(event.id);
      await ada.delete(`${base}/${event.id}/members/${await userId(grace)}`).expect(409);
    });

    it('answers 404 for a user who is no member', async () => {
      const { ada, linus, event } = await setup();
      await ada.delete(`${base}/${event.id}/members/${await userId(linus)}`).expect(404);
      await ada.delete(`${base}/${event.id}/members/${unknownId}`).expect(404);
    });

    it('answers 404 to a non-member, 401 without a session, 400 for a bad id', async () => {
      const { ada, grace, linus, event } = await setup();
      const graceId = await userId(grace);
      await linus.delete(`${base}/${event.id}/members/${graceId}`).expect(404);
      await request(app).delete(`${base}/${event.id}/members/${graceId}`).expect(401);
      await ada.delete(`${base}/${event.id}/members/nope`).expect(400);
    });
  });

  describe('PUT /events/:id/owner', () => {
    it('makes the editor the owner and the owner an editor', async () => {
      const { ada, grace, event } = await setup();
      const res = await putOwner(ada, event.id, userId(grace), 200);

      expect(
        res.body.members.map((m: { email: string; role: string }) => [m.email, m.role]),
      ).toEqual([
        ['grace@example.com', 'owner'],
        ['ada@example.com', 'editor'],
      ]);
      for (const member of res.body.members) {
        expect(memberSchema.strict().safeParse(member).error).toBeUndefined();
      }
      expect((await ada.get(`${base}/${event.id}`).expect(200)).body.event.role).toBe('editor');
      expect((await grace.get(`${base}/${event.id}`).expect(200)).body.event.role).toBe('owner');
    });

    it('lets the new owner delete the event and gives the old one 403', async () => {
      const { ada, grace, event } = await setup();
      await putOwner(ada, event.id, userId(grace), 200);

      await ada.delete(`${base}/${event.id}`).expect(403);
      await grace.delete(`${base}/${event.id}`).expect(204);
      await grace.get(`${base}/${event.id}`).expect(404);
    });

    it('keeps exactly one owner row after a hand-over', async () => {
      const { ada, grace, event } = await setup();
      await putOwner(ada, event.id, userId(grace), 200);

      const owners = await db
        .select()
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, event.id), eq(eventMembers.role, 'owner')));
      expect(owners).toHaveLength(1);
      expect(owners[0]!.userId).toBe(await userId(grace));
      const all = await db.select().from(eventMembers).where(eq(eventMembers.eventId, event.id));
      expect(all).toHaveLength(2);
    });

    it('can hand the event back and forth', async () => {
      const { ada, grace, event } = await setup();
      await putOwner(ada, event.id, userId(grace), 200);
      await putOwner(grace, event.id, userId(ada), 200);
      const owners = await db
        .select()
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, event.id), eq(eventMembers.role, 'owner')));
      expect(owners.map((o) => o.userId)).toEqual([await userId(ada)]);
    });

    it('ends two parallel hand-overs by the owner with one success and no 500', async () => {
      const { ada, grace, event } = await setup();
      const alan = await signedUpAgent('alan@example.com');
      await addEditor(event.id, alan);
      const [graceId, alanId] = [await userId(grace), await userId(alan)];

      const results = await Promise.all([
        ada.put(`${base}/${event.id}/owner`).send({ userId: graceId }),
        ada.put(`${base}/${event.id}/owner`).send({ userId: alanId }),
      ]);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses[0]).toBe(200);
      expect([403, 404, 409]).toContain(statuses[1]);

      const owners = await db
        .select()
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, event.id), eq(eventMembers.role, 'owner')));
      expect(owners).toHaveLength(1);
      expect(owners[0]!.userId).not.toBe(await userId(ada));
    });

    it('answers 403 to an editor', async () => {
      const { ada, grace, event } = await setup();
      const [adaId, graceId] = [await userId(ada), await userId(grace)];
      await putOwner(grace, event.id, graceId, 403);
      await putOwner(grace, event.id, adaId, 403);
    });

    it('answers 409 when handing over to oneself', async () => {
      const { ada, event } = await setup();
      const adaId = await userId(ada);
      await putOwner(ada, event.id, adaId, 409);
    });

    it('answers 409 on a past event', async () => {
      const { ada, grace, event } = await setup();
      await makePast(event.id);
      await putOwner(ada, event.id, userId(grace), 409);
    });

    it('answers 404 when the user is no member, and nothing changes', async () => {
      const { ada, linus, event } = await setup();
      await putOwner(ada, event.id, userId(linus), 404);
      await putOwner(ada, event.id, unknownId, 404);
      expect((await ada.get(`${base}/${event.id}`).expect(200)).body.event.role).toBe('owner');
    });

    it('answers 404 to a non-member and 401 without a session', async () => {
      const { grace, linus, event } = await setup();
      await putOwner(linus, event.id, userId(grace), 404);
      await request(app)
        .put(`${base}/${event.id}/owner`)
        .send({ userId: await userId(grace) })
        .expect(401);
    });

    it('answers 400 with details for a bad body', async () => {
      const { ada, event } = await setup();
      for (const body of [{}, { userId: 'nope' }, { userId: 5 }]) {
        const res = await ada.put(`${base}/${event.id}/owner`).send(body).expect(400);
        expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain('userId');
      }
    });
  });

  describe('invites of an event', () => {
    it('creates an invite for seven days, with the full shape and no-store', async () => {
      const { ada, event } = await setup();
      const res = await ada.post(`${base}/${event.id}/invites`).expect(201);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body).toEqual({
        invite: {
          id: expect.any(String),
          token: expect.any(String),
          expiresAt: expect.any(String),
          createdAt: expect.any(String),
        },
      });
      expect(editorInviteSchema.strict().safeParse(res.body.invite).error).toBeUndefined();
      const lifetime =
        Date.parse(res.body.invite.expiresAt) - Date.parse(res.body.invite.createdAt);
      expect(Math.abs(lifetime - 7 * day)).toBeLessThan(60 * 1000);
    });

    it('lists the open invites with their tokens and no-store', async () => {
      const { ada, event } = await setup();
      const first = await createInvite(ada, event.id);
      const second = await createInvite(ada, event.id);

      const res = await ada.get(`${base}/${event.id}/invites`).expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body.invites).toEqual([first, second]);
    });

    it('leaves out used, expired and revoked invites and those of other events', async () => {
      const { ada, event } = await setup();
      const used = await createInvite(ada, event.id);
      const expired = await createInvite(ada, event.id);
      const revoked = await createInvite(ada, event.id);
      const open = await createInvite(ada, event.id);
      const otherEvent = await createEvent(ada);
      await createInvite(ada, otherEvent.id);

      await db
        .update(editorInvites)
        .set({ usedAt: new Date() })
        .where(eq(editorInvites.id, used.id));
      await db
        .update(editorInvites)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(editorInvites.id, expired.id));
      await ada.delete(`${base}/${event.id}/invites/${revoked.id}`).expect(204);

      const res = await ada.get(`${base}/${event.id}/invites`).expect(200);
      expect(res.body.invites.map((i: { id: string }) => i.id)).toEqual([open.id]);
    });

    it('gives every invite its own token', async () => {
      const { ada, event } = await setup();
      const a = await createInvite(ada, event.id);
      const b = await createInvite(ada, event.id);
      expect(a.token).not.toBe(b.token);
    });

    it('allows at most 10 open invites; used, expired and revoked ones do not count', async () => {
      const { ada, event } = await setup();
      const created = [];
      for (let i = 0; i < 10; i++) created.push(await createInvite(ada, event.id));
      await ada.post(`${base}/${event.id}/invites`).expect(409);

      await db
        .update(editorInvites)
        .set({ usedAt: new Date() })
        .where(eq(editorInvites.id, created[0]!.id));
      await ada.post(`${base}/${event.id}/invites`).expect(201);
      await ada.post(`${base}/${event.id}/invites`).expect(409);

      await db
        .update(editorInvites)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(editorInvites.id, created[1]!.id));
      await ada.post(`${base}/${event.id}/invites`).expect(201);
      await ada.post(`${base}/${event.id}/invites`).expect(409);

      await ada.delete(`${base}/${event.id}/invites/${created[2]!.id}`).expect(204);
      await ada.post(`${base}/${event.id}/invites`).expect(201);

      // another event has its own count
      const other = await createEvent(ada);
      await ada.post(`${base}/${other.id}/invites`).expect(201);
    });

    it('answers 403 to an editor on all three routes', async () => {
      const { ada, grace, event } = await setup();
      const invite = await createInvite(ada, event.id);
      await grace.get(`${base}/${event.id}/invites`).expect(403);
      await grace.post(`${base}/${event.id}/invites`).expect(403);
      await grace.delete(`${base}/${event.id}/invites/${invite.id}`).expect(403);
    });

    it('answers 404 to a non-member on all three routes', async () => {
      const { ada, linus, event } = await setup();
      const invite = await createInvite(ada, event.id);
      await linus.get(`${base}/${event.id}/invites`).expect(404);
      await linus.post(`${base}/${event.id}/invites`).expect(404);
      await linus.delete(`${base}/${event.id}/invites/${invite.id}`).expect(404);
    });

    it('answers 401 without a session on all three routes', async () => {
      const { ada, event } = await setup();
      const invite = await createInvite(ada, event.id);
      await request(app).get(`${base}/${event.id}/invites`).expect(401);
      await request(app).post(`${base}/${event.id}/invites`).expect(401);
      await request(app).delete(`${base}/${event.id}/invites/${invite.id}`).expect(401);
    });

    it('answers 409 when creating an invite for a past event', async () => {
      const { ada, event } = await setup();
      await makePast(event.id);
      await ada.post(`${base}/${event.id}/invites`).expect(409);
    });

    it('revokes an unused invite and then the link is dead', async () => {
      const { ada, event } = await setup();
      const invite = await createInvite(ada, event.id);
      await ada.delete(`${base}/${event.id}/invites/${invite.id}`).expect(204);
      await request(app).get(`${apiPrefix}/invites/${invite.token}`).expect(404);
      const res = await ada.get(`${base}/${event.id}/invites`).expect(200);
      expect(res.body.invites).toEqual([]);
    });

    it('answers 404 when revoking a used, unknown or foreign invite', async () => {
      const { ada, event } = await setup();
      const used = await createInvite(ada, event.id);
      await db
        .update(editorInvites)
        .set({ usedAt: new Date() })
        .where(eq(editorInvites.id, used.id));
      await ada.delete(`${base}/${event.id}/invites/${used.id}`).expect(404);
      await ada.delete(`${base}/${event.id}/invites/${unknownId}`).expect(404);

      const otherEvent = await createEvent(ada);
      const foreign = await createInvite(ada, otherEvent.id);
      await ada.delete(`${base}/${event.id}/invites/${foreign.id}`).expect(404);
      // still there
      const res = await ada.get(`${base}/${otherEvent.id}/invites`).expect(200);
      expect(res.body.invites).toHaveLength(1);
      // the used one stays as a record
      expect(
        await db.select().from(editorInvites).where(eq(editorInvites.id, used.id)),
      ).toHaveLength(1);
    });

    it('answers 400 for ids that are no uuid', async () => {
      const { ada, event } = await setup();
      await ada.delete(`${base}/${event.id}/invites/nope`).expect(400);
      await ada.get(`${base}/nope/invites`).expect(400);
    });
  });
});
