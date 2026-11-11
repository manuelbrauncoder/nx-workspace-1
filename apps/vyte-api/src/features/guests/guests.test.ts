import { db } from '@server/core/db/db';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiPrefix } from '../../shared/api.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { eventMembers, events } from '../events/events.table.js';
import { guests } from './guests.table.js';

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

async function addGuest(agent: Agent, eventId: string, body: Record<string, unknown> = {}) {
  const res = await agent
    .post(`${base}/${eventId}/guests`)
    .send({ name: 'Grace', ...body })
    .expect(201);
  return res.body.guest as { id: string; token: string; [key: string]: unknown };
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

function detailPaths(res: request.Response): string[] {
  return res.body.error.details.map((detail: { path: string }) => detail.path);
}

describe('guests', () => {
  describe('without a session', () => {
    it('answers 401 on every route', async () => {
      const url = `${base}/${unknownId}/guests`;
      await request(app).get(url).expect(401);
      await request(app).post(url).send({ name: 'x' }).expect(401);
      await request(app)
        .post(`${url}/bulk`)
        .send({ names: ['x'] })
        .expect(401);
      await request(app).patch(`${url}/${unknownId}`).send({ name: 'x' }).expect(401);
      await request(app)
        .put(`${url}/${unknownId}/response`)
        .send({ response: 'accepted' })
        .expect(401);
      await request(app).delete(`${url}/${unknownId}`).expect(401);
      await request(app).post(`${url}/${unknownId}/token`).expect(401);
    });
  });

  describe('POST /events/:id/guests', () => {
    it('adds a guest with defaults and the full shape', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent
        .post(`${base}/${event.id}/guests`)
        .send({ name: ' Grace ' })
        .expect(201);

      expect(res.body).toEqual({
        guest: {
          id: expect.any(String),
          name: 'Grace',
          note: null,
          maxCompanions: 0,
          token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          photoToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          response: 'pending',
          companions: 0,
          companionsReduced: false,
          message: null,
          answeredBy: null,
          respondedAt: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('stores note and allowance, an empty note becomes null', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { note: 'Friend', maxCompanions: 3 });
      expect(guest).toMatchObject({ note: 'Friend', maxCompanions: 3 });
      const empty = await addGuest(agent, event.id, { note: '  ' });
      expect(empty['note']).toBeNull();
    });

    it('gives every guest a different token', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const a = await addGuest(agent, event.id);
      const b = await addGuest(agent, event.id);
      expect(a.token).not.toBe(b.token);
    });

    it('answers 400 with details for bad input', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const url = `${base}/${event.id}/guests`;

      let res = await agent.post(url).send({}).expect(400);
      expect(detailPaths(res)).toContain('name');
      res = await agent.post(url).send({ name: '   ' }).expect(400);
      expect(detailPaths(res)).toContain('name');
      res = await agent
        .post(url)
        .send({ name: 'x'.repeat(101) })
        .expect(400);
      expect(detailPaths(res)).toContain('name');
      res = await agent.post(url).send({ name: 'x', maxCompanions: 11 }).expect(400);
      expect(detailPaths(res)).toContain('maxCompanions');
      res = await agent.post(url).send({ name: 'x', maxCompanions: -1 }).expect(400);
      expect(detailPaths(res)).toContain('maxCompanions');
      res = await agent.post(url).send({ name: 'x', maxCompanions: 1.5 }).expect(400);
      expect(detailPaths(res)).toContain('maxCompanions');
      res = await agent
        .post(url)
        .send({ name: 'x', note: 'n'.repeat(501) })
        .expect(400);
      expect(detailPaths(res)).toContain('note');
    });

    it('answers 400 for a malformed event id', async () => {
      const agent = await signedUpAgent('ada@example.com');
      await agent.post(`${base}/nope/guests`).send({ name: 'x' }).expect(400);
    });

    it('answers 404 for a non-member and for an unknown event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const event = await createEvent(ada);
      await eve.post(`${base}/${event.id}/guests`).send({ name: 'x' }).expect(404);
      await eve.get(`${base}/${event.id}/guests`).expect(404);
      await ada.post(`${base}/${unknownId}/guests`).send({ name: 'x' }).expect(404);
    });

    it('lets an editor add guests', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await addEditor(event.id, bob);
      await addGuest(bob, event.id);
    });

    it('answers 409 on a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await makePast(event.id);
      await agent.post(`${base}/${event.id}/guests`).send({ name: 'x' }).expect(409);
    });
  });

  describe('GET /events/:id/guests', () => {
    it('lists guests by name, case-insensitive, with no-store', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id, { name: 'charlie' });
      await addGuest(agent, event.id, { name: 'Alice' });
      await addGuest(agent, event.id, { name: 'Bob' });

      const res = await agent.get(`${base}/${event.id}/guests`).expect(200);
      expect(res.body.guests.map((g: { name: string }) => g.name)).toEqual([
        'Alice',
        'Bob',
        'charlie',
      ]);
      expect(res.body.guests[0]).toHaveProperty('token');
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('returns an empty list for a new event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent.get(`${base}/${event.id}/guests`).expect(200);
      expect(res.body).toEqual({ guests: [] });
    });

    it('stays readable on a past event, also for an editor', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await addEditor(event.id, bob);
      await addGuest(ada, event.id);
      await makePast(event.id);

      for (const agent of [ada, bob]) {
        const res = await agent.get(`${base}/${event.id}/guests`).expect(200);
        expect(res.body.guests).toHaveLength(1);
      }
    });

    it('does not list guests of another event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const one = await createEvent(agent);
      const two = await createEvent(agent);
      await addGuest(agent, one.id);
      const res = await agent.get(`${base}/${two.id}/guests`).expect(200);
      expect(res.body.guests).toEqual([]);
    });
  });

  describe('POST /events/:id/guests/bulk', () => {
    it('adds one guest per name with the same allowance', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: ['Alice', ' Bob '], maxCompanions: 2 })
        .expect(201);
      expect(res.body.guests).toHaveLength(2);
      expect(res.body.guests.map((g: { name: string }) => g.name)).toEqual(['Alice', 'Bob']);
      for (const guest of res.body.guests) {
        expect(guest).toMatchObject({ maxCompanions: 2, response: 'pending', note: null });
      }
      expect(res.body.guests[0].token).not.toBe(res.body.guests[1].token);
    });

    it('accepts exactly 100 names', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const names = Array.from({ length: 100 }, (_, i) => `Guest ${i}`);
      const res = await agent.post(`${base}/${event.id}/guests/bulk`).send({ names }).expect(201);
      expect(res.body.guests).toHaveLength(100);
    });

    it('answers 400 with details for bad input', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const url = `${base}/${event.id}/guests/bulk`;

      let res = await agent.post(url).send({}).expect(400);
      expect(detailPaths(res)).toContain('names');
      res = await agent.post(url).send({ names: [] }).expect(400);
      expect(detailPaths(res)).toContain('names');
      res = await agent
        .post(url)
        .send({ names: Array.from({ length: 101 }, (_, i) => `G${i}`) })
        .expect(400);
      expect(detailPaths(res)).toContain('names');
      res = await agent
        .post(url)
        .send({ names: ['ok', ' '] })
        .expect(400);
      expect(detailPaths(res)).toContain('names.1');
      res = await agent
        .post(url)
        .send({ names: ['ok'], maxCompanions: 11 })
        .expect(400);
      expect(detailPaths(res)).toContain('maxCompanions');
      expect(await db.select().from(guests)).toHaveLength(0);
    });

    it('answers 404 for a non-member and 409 on a past event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const event = await createEvent(ada);
      await eve
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: ['x'] })
        .expect(404);
      await makePast(event.id);
      await ada
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: ['x'] })
        .expect(409);
    });
  });

  describe('limit of 500 guests', () => {
    async function insertGuests(eventId: string, amount: number) {
      await db.insert(guests).values(
        Array.from({ length: amount }, (_, i) => ({
          eventId,
          name: `Guest ${i}`,
          token: `token-${eventId}-${i}`,
          photoToken: `photo-token-${eventId}-${i}`,
        })),
      );
    }

    it('accepts the 500th and refuses the 501st with 409', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await insertGuests(event.id, 499);
      await addGuest(agent, event.id, { name: 'The 500th' });
      const res = await agent
        .post(`${base}/${event.id}/guests`)
        .send({ name: 'The 501st' })
        .expect(409);
      expect(res.body.error.message).toEqual(expect.any(String));
      expect(await db.select().from(guests)).toHaveLength(500);
    });

    it('refuses a list that would pass 500 and adds none of it', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await insertGuests(event.id, 450);
      await agent
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: Array.from({ length: 51 }, (_, i) => `New ${i}`) })
        .expect(409);
      expect(await db.select().from(guests)).toHaveLength(450);
      await agent
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: Array.from({ length: 50 }, (_, i) => `New ${i}`) })
        .expect(201);
      expect(await db.select().from(guests)).toHaveLength(500);
    });

    it('counts per event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const one = await createEvent(agent);
      const two = await createEvent(agent);
      await insertGuests(one.id, 500);
      await addGuest(agent, two.id);
    });

    it('lets only one of two parallel adds take the last place', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await insertGuests(event.id, 499);

      const results = await Promise.all([
        agent.post(`${base}/${event.id}/guests`).send({ name: 'A' }),
        agent.post(`${base}/${event.id}/guests`).send({ name: 'B' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await db.select().from(guests)).toHaveLength(500);
    });
  });

  describe('PATCH /events/:id/guests/:guestId', () => {
    it('changes name, note and allowance, but not the answer', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 2 });

      const res = await agent
        .patch(`${base}/${event.id}/guests/${guest.id}`)
        .send({ name: ' Grace H. ', note: 'Colleague', maxCompanions: 4 })
        .expect(200);
      expect(res.body.guest).toMatchObject({
        id: guest.id,
        name: 'Grace H.',
        note: 'Colleague',
        maxCompanions: 4,
        response: 'pending',
        token: guest.token,
      });
    });

    it('changes a single field and clears a note with an empty string or null', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { note: 'Friend', maxCompanions: 1 });
      const url = `${base}/${event.id}/guests/${guest.id}`;

      let res = await agent.patch(url).send({ name: 'New' }).expect(200);
      expect(res.body.guest).toMatchObject({ name: 'New', note: 'Friend', maxCompanions: 1 });
      res = await agent.patch(url).send({ note: '' }).expect(200);
      expect(res.body.guest.note).toBeNull();
    });

    it('answers 400 with details for bad input', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      const url = `${base}/${event.id}/guests/${guest.id}`;

      await agent.patch(url).send({}).expect(400);
      let res = await agent.patch(url).send({ name: '' }).expect(400);
      expect(detailPaths(res)).toContain('name');
      res = await agent.patch(url).send({ maxCompanions: 11 }).expect(400);
      expect(detailPaths(res)).toContain('maxCompanions');
      await agent.patch(`${base}/${event.id}/guests/nope`).send({ name: 'x' }).expect(400);
    });

    it('answers 404 for a non-member, an unknown guest and a guest of another event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const one = await createEvent(ada);
      const two = await createEvent(ada);
      const guest = await addGuest(ada, one.id);

      await eve.patch(`${base}/${one.id}/guests/${guest.id}`).send({ name: 'x' }).expect(404);
      await ada.patch(`${base}/${one.id}/guests/${unknownId}`).send({ name: 'x' }).expect(404);
      await ada.patch(`${base}/${two.id}/guests/${guest.id}`).send({ name: 'x' }).expect(404);
    });

    it('answers 409 on a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await makePast(event.id);
      await agent.patch(`${base}/${event.id}/guests/${guest.id}`).send({ name: 'x' }).expect(409);
    });

    describe('companionsReduced', () => {
      it('cuts the companions and sets the flag when the allowance drops below them', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id, { maxCompanions: 4 });
        const url = `${base}/${event.id}/guests/${guest.id}`;
        await agent
          .put(`${url}/response`)
          .send({ response: 'accepted', companions: 3 })
          .expect(200);

        const res = await agent.patch(url).send({ maxCompanions: 1 }).expect(200);
        expect(res.body.guest).toMatchObject({
          maxCompanions: 1,
          companions: 1,
          companionsReduced: true,
          response: 'accepted',
        });
      });

      it('leaves companions and flag when the allowance stays at or above them', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id, { maxCompanions: 4 });
        const url = `${base}/${event.id}/guests/${guest.id}`;
        await agent
          .put(`${url}/response`)
          .send({ response: 'accepted', companions: 2 })
          .expect(200);

        const res = await agent.patch(url).send({ maxCompanions: 2 }).expect(200);
        expect(res.body.guest).toMatchObject({ companions: 2, companionsReduced: false });
      });

      it('does not set the flag for a guest who has not answered', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id, { maxCompanions: 4 });
        const res = await agent
          .patch(`${base}/${event.id}/guests/${guest.id}`)
          .send({ maxCompanions: 0 })
          .expect(200);
        expect(res.body.guest).toMatchObject({ companions: 0, companionsReduced: false });
      });

      it('keeps the flag through a rename and clears it with the next answer of the guest', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id, { maxCompanions: 4 });
        const url = `${base}/${event.id}/guests/${guest.id}`;
        await agent
          .put(`${url}/response`)
          .send({ response: 'accepted', companions: 3 })
          .expect(200);
        await agent.patch(url).send({ maxCompanions: 1 }).expect(200);

        const renamed = await agent.patch(url).send({ name: 'Renamed' }).expect(200);
        expect(renamed.body.guest.companionsReduced).toBe(true);

        await request(app)
          .put(`${apiPrefix}/rsvp/${guest.token}`)
          .send({ response: 'accepted', companions: 1 })
          .expect(200);
        const list = await agent.get(`${base}/${event.id}/guests`).expect(200);
        expect(list.body.guests[0]).toMatchObject({
          companions: 1,
          companionsReduced: false,
          answeredBy: 'guest',
        });
      });

      it('clears the flag when the host records a new answer', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id, { maxCompanions: 4 });
        const url = `${base}/${event.id}/guests/${guest.id}`;
        await agent
          .put(`${url}/response`)
          .send({ response: 'accepted', companions: 3 })
          .expect(200);
        await agent.patch(url).send({ maxCompanions: 1 }).expect(200);

        const res = await agent
          .put(`${url}/response`)
          .send({ response: 'accepted', companions: 1 })
          .expect(200);
        expect(res.body.guest.companionsReduced).toBe(false);
      });
    });
  });

  describe('PUT /events/:id/guests/:guestId/response', () => {
    it('records an accepted answer with companions as host', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 3 });

      const res = await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted', companions: 2 })
        .expect(200);
      expect(res.body.guest).toMatchObject({
        id: guest.id,
        response: 'accepted',
        companions: 2,
        answeredBy: 'host',
        respondedAt: expect.any(String),
      });
    });

    it('defaults companions to 0', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 3 });
      const res = await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted' })
        .expect(200);
      expect(res.body.guest.companions).toBe(0);
    });

    it('sets companions to 0 on decline', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 3 });
      const url = `${base}/${event.id}/guests/${guest.id}/response`;
      await agent.put(url).send({ response: 'accepted', companions: 2 }).expect(200);
      const res = await agent.put(url).send({ response: 'declined', companions: 2 }).expect(200);
      expect(res.body.guest).toMatchObject({
        response: 'declined',
        companions: 0,
        answeredBy: 'host',
      });
    });

    it('answers 400 with path companions above the allowance', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 1 });
      const res = await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted', companions: 2 })
        .expect(400);
      expect(detailPaths(res)).toContain('companions');
    });

    it('answers 400 for a bad response and for companions out of range', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 10 });
      const url = `${base}/${event.id}/guests/${guest.id}/response`;

      let res = await agent.put(url).send({}).expect(400);
      expect(detailPaths(res)).toContain('response');
      res = await agent.put(url).send({ response: 'pending' }).expect(400);
      expect(detailPaths(res)).toContain('response');
      res = await agent.put(url).send({ response: 'accepted', companions: 11 }).expect(400);
      expect(detailPaths(res)).toContain('companions');
      res = await agent.put(url).send({ response: 'accepted', companions: -1 }).expect(400);
      expect(detailPaths(res)).toContain('companions');
    });

    it('answers 404 for a non-member and for a guest of another event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const one = await createEvent(ada);
      const two = await createEvent(ada);
      const guest = await addGuest(ada, one.id);

      await eve
        .put(`${base}/${one.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted' })
        .expect(404);
      await ada
        .put(`${base}/${two.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted' })
        .expect(404);
    });

    it('answers 409 on a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await makePast(event.id);
      await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted' })
        .expect(409);
    });

    it('lets the host record an answer after the RSVP deadline', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, { rsvpDeadline: inDays(5) });
      const guest = await addGuest(agent, event.id);
      await db
        .update(events)
        .set({ rsvpDeadline: new Date(Date.now() - day) })
        .where(eq(events.id, event.id));
      await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'declined' })
        .expect(200);
    });
  });

  describe('POST /events/:id/guests/:guestId/token', () => {
    it('issues a new token and ends the old link', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(200);

      const res = await agent.post(`${base}/${event.id}/guests/${guest.id}/token`).expect(200);
      expect(res.body.guest.id).toBe(guest.id);
      expect(res.body.guest.token).not.toBe(guest.token);
      expect(res.body.guest.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(404);
      await request(app).get(`${apiPrefix}/rsvp/${res.body.guest.token}`).expect(200);
    });

    it('keeps the answer of the guest', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id, { maxCompanions: 1 });
      await agent
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted', companions: 1 })
        .expect(200);
      const res = await agent.post(`${base}/${event.id}/guests/${guest.id}/token`).expect(200);
      expect(res.body.guest).toMatchObject({ response: 'accepted', companions: 1 });
    });

    it('answers 404 for a non-member, an unknown guest and a guest of another event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const one = await createEvent(ada);
      const two = await createEvent(ada);
      const guest = await addGuest(ada, one.id);

      await eve.post(`${base}/${one.id}/guests/${guest.id}/token`).expect(404);
      await ada.post(`${base}/${one.id}/guests/${unknownId}/token`).expect(404);
      await ada.post(`${base}/${two.id}/guests/${guest.id}/token`).expect(404);
      await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(200);
    });

    it('answers 409 on a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await makePast(event.id);
      await agent.post(`${base}/${event.id}/guests/${guest.id}/token`).expect(409);
    });
  });

  describe('DELETE /events/:id/guests/:guestId', () => {
    it('removes the guest and ends their link', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);

      await agent.delete(`${base}/${event.id}/guests/${guest.id}`).expect(204);
      const list = await agent.get(`${base}/${event.id}/guests`).expect(200);
      expect(list.body.guests).toEqual([]);
      await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(404);
      await agent.delete(`${base}/${event.id}/guests/${guest.id}`).expect(404);
    });

    it('answers 404 for a non-member and for a guest of another event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const one = await createEvent(ada);
      const two = await createEvent(ada);
      const guest = await addGuest(ada, one.id);

      await eve.delete(`${base}/${one.id}/guests/${guest.id}`).expect(404);
      await ada.delete(`${base}/${two.id}/guests/${guest.id}`).expect(404);
      expect(await db.select().from(guests)).toHaveLength(1);
    });

    it('answers 409 on a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await makePast(event.id);
      await agent.delete(`${base}/${event.id}/guests/${guest.id}`).expect(409);
      expect(await db.select().from(guests)).toHaveLength(1);
    });
  });

  describe('counts on the event', () => {
    it('are all 0 without guests', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.counts).toEqual({
        invited: 0,
        coming: 0,
        declined: 0,
        pending: 0,
        atMost: 0,
      });
    });

    it('follow the answers, on the event, the list and after updates', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const a = await addGuest(agent, event.id, { name: 'A', maxCompanions: 2 });
      const b = await addGuest(agent, event.id, { name: 'B', maxCompanions: 1 });
      await addGuest(agent, event.id, { name: 'C', maxCompanions: 0 });
      await addGuest(agent, event.id, { name: 'D', maxCompanions: 3 });

      let res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.counts).toEqual({
        invited: 4,
        coming: 0,
        declined: 0,
        pending: 4,
        atMost: 4 + 6,
      });

      await agent
        .put(`${base}/${event.id}/guests/${a.id}/response`)
        .send({ response: 'accepted', companions: 2 })
        .expect(200);
      await request(app)
        .put(`${apiPrefix}/rsvp/${b.token}`)
        .send({ response: 'declined', companions: 1 })
        .expect(200);

      res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.counts).toEqual({
        invited: 4,
        coming: 3,
        declined: 1,
        pending: 2,
        atMost: 10,
      });

      const list = await agent.get(base).expect(200);
      expect(list.body.events[0].counts).toEqual(res.body.event.counts);

      // lowering the allowance cuts the companions and lowers coming and atMost
      await agent
        .patch(`${base}/${event.id}/guests/${a.id}`)
        .send({ maxCompanions: 0 })
        .expect(200);
      res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.counts).toEqual({
        invited: 4,
        coming: 1,
        declined: 1,
        pending: 2,
        atMost: 8,
      });

      await agent.delete(`${base}/${event.id}/guests/${a.id}`).expect(204);
      res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.counts).toEqual({
        invited: 3,
        coming: 0,
        declined: 1,
        pending: 2,
        atMost: 7,
      });
    });

    it('are kept per event and readable once the event is over', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const one = await createEvent(agent);
      const two = await createEvent(agent);
      const guest = await addGuest(agent, one.id);
      await agent
        .put(`${base}/${one.id}/guests/${guest.id}/response`)
        .send({ response: 'accepted' })
        .expect(200);
      await makePast(one.id);

      const first = await agent.get(`${base}/${one.id}`).expect(200);
      expect(first.body.event.counts).toMatchObject({ invited: 1, coming: 1 });
      const second = await agent.get(`${base}/${two.id}`).expect(200);
      expect(second.body.event.counts.invited).toBe(0);
    });
  });

  it('removes guests with their event', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const event = await createEvent(agent);
    const guest = await addGuest(agent, event.id);
    await agent.delete(`${base}/${event.id}`).expect(204);
    await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(404);
    expect(await db.select().from(guests)).toHaveLength(0);
  });

  describe('mass assignment', () => {
    const extra = {
      token: 'x'.repeat(43),
      response: 'accepted',
      answeredBy: 'host',
      eventId: unknownId,
      companions: 2,
      companionsReduced: true,
    };
    const untouched = {
      response: 'pending',
      answeredBy: null,
      companions: 0,
      companionsReduced: false,
    };

    it('ignores server-owned fields on POST /guests', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent
        .post(`${base}/${event.id}/guests`)
        .send({ name: 'Grace', maxCompanions: 2, ...extra })
        .expect(201);
      expect(res.body.guest).toMatchObject(untouched);
      expect(res.body.guest.token).not.toBe(extra.token);
      const list = await agent.get(`${base}/${event.id}/guests`).expect(200);
      expect(list.body.guests).toHaveLength(1);
    });

    it('ignores server-owned fields on POST /bulk', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent
        .post(`${base}/${event.id}/guests/bulk`)
        .send({ names: ['A', 'B'], ...extra })
        .expect(201);
      for (const guest of res.body.guests) {
        expect(guest).toMatchObject(untouched);
        expect(guest.token).not.toBe(extra.token);
      }
      const list = await agent.get(`${base}/${event.id}/guests`).expect(200);
      expect(list.body.guests).toHaveLength(2);
    });

    it('ignores server-owned fields on PATCH', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const other = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      const res = await agent
        .patch(`${base}/${event.id}/guests/${guest.id}`)
        .send({ name: 'Renamed', ...extra, eventId: other.id })
        .expect(200);
      expect(res.body.guest).toMatchObject({ name: 'Renamed', ...untouched, token: guest.token });
      const inOther = await agent.get(`${base}/${other.id}/guests`).expect(200);
      expect(inOther.body.guests).toEqual([]);
    });
  });

  describe('an admin who is not a member', () => {
    it('gets 404 on every guest route', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      const admin = await adminAgent();
      const url = `${base}/${event.id}/guests`;

      await admin.get(url).expect(404);
      await admin.post(url).send({ name: 'x' }).expect(404);
      await admin
        .post(`${url}/bulk`)
        .send({ names: ['x'] })
        .expect(404);
      await admin.patch(`${url}/${guest.id}`).send({ name: 'x' }).expect(404);
      await admin.put(`${url}/${guest.id}/response`).send({ response: 'accepted' }).expect(404);
      await admin.post(`${url}/${guest.id}/token`).expect(404);
      await admin.delete(`${url}/${guest.id}`).expect(404);
      expect(await db.select().from(guests)).toHaveLength(1);
    });
  });

  describe('GET /events/:id/guests/export', () => {
    const BOM = '﻿';
    const exportUrl = (eventId: string) => `${base}/${eventId}/guests/export`;
    const lines = (text: string) => text.split('\r\n');

    it('answers 200 with CSV, the file name and no-store', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id);

      const res = await agent.get(exportUrl(event.id)).expect(200);
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toMatch(/^attachment;/);
      expect(res.headers['content-disposition']).toContain('filename=Summer-party-gaeste.csv');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.text.startsWith(BOM + '"Name";')).toBe(true);
    });

    it('encodes umlauts in the file name as RFC 5987 filename*', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, { title: 'Größe Fülle!' });
      const res = await agent.get(exportUrl(event.id)).expect(200);
      const disposition = res.headers['content-disposition']!;
      expect(disposition).toMatch(/^attachment;/);
      expect(disposition).toContain("filename*=UTF-8''Gr%C3%B6%C3%9Fe-F%C3%BClle-gaeste.csv");
      // the plain filename= part has to stay ASCII-safe for the header
      expect(disposition).toMatch(/^[\x20-\x7e]+$/);
    });

    it('answers 200 for a title with a letter outside the BMP at the cut', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, { title: `${'a'.repeat(59)}𝐀𝐀` });
      const res = await agent.get(exportUrl(event.id)).expect(200);
      expect(res.headers['content-disposition']).toContain(
        `filename*=UTF-8''${'a'.repeat(59)}%F0%9D%90%80-gaeste.csv`,
      );
    });

    it('keeps one line per guest and guards a trigger after a separator', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id, { name: 'x, =1+1', note: 'a\nb' });
      const res = await agent.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)[1]).toBe('"x, \'=1+1";"0";"Offen";"0";"0";"";"a b";"";""');
    });

    it('sorts by name case-insensitively and writes the guests with their answers', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const charlie = await addGuest(agent, event.id, { name: 'charlie', note: 'Cousin' });
      const alice = await addGuest(agent, event.id, { name: 'Alice', maxCompanions: 3 });
      const bob = await addGuest(agent, event.id, { name: 'Bob', maxCompanions: 2 });
      await addGuest(agent, event.id, { name: 'Dora' });

      // a guest answer
      await request(app)
        .put(`${apiPrefix}/rsvp/${alice.token}`)
        .send({ response: 'accepted', companions: 2, message: 'Can not wait' })
        .expect(200);
      // a host-recorded answer
      await agent
        .put(`${base}/${event.id}/guests/${charlie.id}/response`)
        .send({ response: 'declined' })
        .expect(200);
      // a reduced allowance: the answer is cut to the new maximum
      await request(app)
        .put(`${apiPrefix}/rsvp/${bob.token}`)
        .send({ response: 'accepted', companions: 2 })
        .expect(200);
      await agent
        .patch(`${base}/${event.id}/guests/${bob.id}`)
        .send({ maxCompanions: 1 })
        .expect(200);

      const res = await agent.get(`${exportUrl(event.id)}?lang=de`).expect(200);
      const rows = lines(res.text);
      expect(rows).toHaveLength(6);
      expect(rows.at(-1)).toBe('');
      expect(rows[0]!.startsWith(BOM + '"Name";"Begleitung erlaubt";"Antwort"')).toBe(true);

      const answered = (name: string) => {
        const row = rows.find((r) => r.startsWith(`"${name}";`))!;
        return row.split(';');
      };
      expect(rows.slice(1, 5).map((r) => r.split(';')[0])).toEqual([
        '"Alice"',
        '"Bob"',
        '"charlie"',
        '"Dora"',
      ]);

      const a = answered('Alice');
      expect(a.slice(0, 8)).toEqual([
        '"Alice"',
        '"3"',
        '"Zugesagt"',
        '"2"',
        '"3"',
        '"Can not wait"',
        '""',
        '"Gast"',
      ]);
      expect(a[8]).toMatch(/^"\d{4}-\d{2}-\d{2} \d{2}:\d{2}"$/);

      const b = answered('Bob');
      expect(b.slice(0, 5)).toEqual(['"Bob"', '"1"', '"Zugesagt"', '"1"', '"2"']);

      const c = answered('charlie');
      expect(c.slice(0, 8)).toEqual([
        '"charlie"',
        '"0"',
        '"Abgesagt"',
        '"0"',
        '"0"',
        '""',
        '"Cousin"',
        '"Host"',
      ]);
      expect(c[8]).toMatch(/^"\d{4}-\d{2}-\d{2} \d{2}:\d{2}"$/);

      expect(rows[4]).toBe('"Dora";"0";"Offen";"0";"0";"";"";"";""');
    });

    it('writes the respondedAt in the event time zone', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      await db
        .update(guests)
        .set({
          response: 'accepted',
          answeredBy: 'guest',
          respondedAt: new Date('2027-07-14T17:05:00Z'),
        })
        .where(eq(guests.id, guest.id));
      let res = await agent.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)[1]!.endsWith(';"2027-07-14 19:05"')).toBe(true);

      await db.update(events).set({ timeZone: 'America/New_York' }).where(eq(events.id, event.id));
      res = await agent.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)[1]!.endsWith(';"2027-07-14 13:05"')).toBe(true);
    });

    it('guards a name that would run as a formula', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id, { name: '=HYPERLINK("x")' });
      const res = await agent.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)[1]!.startsWith(`"'=HYPERLINK(""x"")";`)).toBe(true);
    });

    it('writes English headings and file name for lang=en', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id);
      const res = await agent.get(`${exportUrl(event.id)}?lang=en`).expect(200);
      expect(res.headers['content-disposition']).toContain('filename=Summer-party-guests.csv');
      expect(lines(res.text)[0]).toBe(
        BOM +
          '"Name";"Companions allowed";"Answer";"Companions";"People";"Message";"Note";"Answered by";"Answered at"',
      );
      expect(lines(res.text)[1]).toContain('"Pending"');
    });

    it('answers 400 for an unknown language', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent.get(`${exportUrl(event.id)}?lang=fr`).expect(400);
      expect(detailPaths(res)).toContain('lang');
    });

    it('lets an editor export', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await addEditor(event.id, bob);
      await addGuest(ada, event.id);
      const res = await bob.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)).toHaveLength(3);
    });

    it('works for a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await addGuest(agent, event.id);
      await makePast(event.id);
      const res = await agent.get(exportUrl(event.id)).expect(200);
      expect(lines(res.text)).toHaveLength(3);
    });

    it('answers 401 without a session', async () => {
      await request(app).get(exportUrl(unknownId)).expect(401);
    });

    it('answers 404 for a non-member, an admin who is not a member and an unknown event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const admin = await adminAgent();
      const event = await createEvent(ada);
      await addGuest(ada, event.id);

      await eve.get(exportUrl(event.id)).expect(404);
      await admin.get(exportUrl(event.id)).expect(404);
      await ada.get(exportUrl(unknownId)).expect(404);
    });

    it('answers 400 for a malformed event id', async () => {
      const agent = await signedUpAgent('ada@example.com');
      await agent.get(exportUrl('nope')).expect(400);
    });

    it('contains only the guests of that event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const one = await createEvent(agent);
      const two = await createEvent(agent);
      await addGuest(agent, one.id, { name: 'InOne' });
      await addGuest(agent, two.id, { name: 'InTwo' });
      const res = await agent.get(exportUrl(one.id)).expect(200);
      expect(res.text).toContain('"InOne"');
      expect(res.text).not.toContain('InTwo');
    });

    it('gives only the heading row for an event without guests', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent.get(exportUrl(event.id)).expect(200);
      const rows = lines(res.text);
      expect(rows).toHaveLength(2);
      expect(rows[0]!.startsWith(BOM + '"Name"')).toBe(true);
      expect(rows[1]).toBe('');
    });
  });

  describe('Cache-Control', () => {
    it('is no-store on PATCH, PUT response, token renewal and DELETE', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const guest = await addGuest(agent, event.id);
      const url = `${base}/${event.id}/guests/${guest.id}`;

      const responses = [
        await agent.patch(url).send({ name: 'x' }).expect(200),
        await agent.put(`${url}/response`).send({ response: 'accepted' }).expect(200),
        await agent.post(`${url}/token`).expect(200),
        await agent
          .post(`${base}/${event.id}/guests/bulk`)
          .send({ names: ['y'] })
          .expect(201),
        await agent.delete(url).expect(204),
      ];
      for (const res of responses) expect(res.headers['cache-control']).toContain('no-store');
    });
  });

  describe('a host lowering the allowance while the guest answers', () => {
    it('never ends with more companions than the allowance', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const seen = new Set<string>();

      for (let round = 0; round < 15; round++) {
        const guest = await addGuest(agent, event.id, { name: `G${round}`, maxCompanions: 3 });
        const [patch, put] = await Promise.all([
          agent.patch(`${base}/${event.id}/guests/${guest.id}`).send({ maxCompanions: 1 }),
          request(app)
            .put(`${apiPrefix}/rsvp/${guest.token}`)
            .send({ response: 'accepted', companions: 3 }),
        ]);
        expect(patch.status).toBe(200);
        // the answer is either taken before the cut (then cut) or refused after it (400)
        expect([200, 400]).toContain(put.status);

        const [row] = await db.select().from(guests).where(eq(guests.id, guest.id));
        expect(row!.maxCompanions).toBe(1);
        expect(row!.companions).toBeLessThanOrEqual(row!.maxCompanions);
        if (put.status === 200) {
          // the answer committed first, so the cut must have been recorded
          expect(row).toMatchObject({
            response: 'accepted',
            companions: 1,
            companionsReduced: true,
          });
        } else {
          expect(row).toMatchObject({
            response: 'pending',
            companions: 0,
            companionsReduced: false,
          });
        }
        seen.add(String(put.status));
      }
      expect(seen.size).toBeGreaterThan(0);
    });
  });
});
