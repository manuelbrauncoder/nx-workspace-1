import { db } from '@server/core/db/db';
import { logger } from '@server/core/logger';
import { eq } from 'drizzle-orm';
import { pino } from 'pino';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { apiPrefix } from '../../shared/api.js';
import { app, signedUpAgent } from '../../test/helpers.js';
import { eventMembers, events } from '../events/events.table.js';
import { guests } from '../guests/guests.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const rsvp = `${apiPrefix}/rsvp`;
const day = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();
const unknownId = '00000000-0000-4000-8000-000000000000';

async function createEvent(agent: Agent, extra: Record<string, unknown> = {}) {
  const res = await agent
    .post(base)
    .send({
      title: 'Summer party',
      description: '<p>Bring food</p>',
      locationName: 'Garden',
      address: 'Main street 1',
      startsAt: inDays(10),
      timeZone: 'Europe/Berlin',
      ...extra,
    })
    .expect(201);
  return res.body.event as { id: string };
}

async function addGuest(agent: Agent, eventId: string, body: Record<string, unknown> = {}) {
  const res = await agent
    .post(`${base}/${eventId}/guests`)
    .send({ name: 'Grace', maxCompanions: 2, ...body })
    .expect(201);
  return res.body.guest as { id: string; token: string };
}

/** A user with a display name; `signedUpAgent` signs up without one. */
async function namedAgent(email: string, name: string) {
  const agent = request.agent(app);
  await agent
    .post(`${apiPrefix}/auth/sign-up`)
    .send({ email, password: 'correct-horse', name })
    .expect(201);
  return agent;
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

/** Starts the event now-ish in the past while it is still running (ends later). */
async function makeRunning(eventId: string) {
  await db
    .update(events)
    .set({
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
      rsvpDeadline: null,
    })
    .where(eq(events.id, eventId));
}

function png() {
  return sharp({ create: { width: 400, height: 200, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
}

function detailPaths(res: request.Response): string[] {
  return res.body.error.details.map((detail: { path: string }) => detail.path);
}

describe('rsvp', () => {
  describe('GET /rsvp/:token', () => {
    it('shows the invitation without a session, with the full shape', async () => {
      const ada = await namedAgent('ada@example.com', 'Ada');
      const event = await createEvent(ada, { rsvpDeadline: inDays(5) });
      const guest = await addGuest(ada, event.id, { name: 'Grace', note: 'secret note' });

      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body).toEqual({
        invitation: {
          past: false,
          open: true,
          event: {
            title: 'Summer party',
            description: '<p>Bring food</p>',
            locationName: 'Garden',
            address: 'Main street 1',
            allDay: false,
            startsAt: expect.any(String),
            endsAt: null,
            timeZone: 'Europe/Berlin',
            rsvpDeadline: expect.any(String),
            images: [],
            hosts: ['Ada'],
          },
          guest: {
            name: 'Grace',
            maxCompanions: 2,
            response: 'pending',
            companions: 0,
            message: null,
            respondedAt: null,
          },
        },
      });
      // nothing of the host side leaks
      expect(JSON.stringify(res.body)).not.toContain('secret note');
      expect(JSON.stringify(res.body)).not.toContain('ada@example.com');
      expect(JSON.stringify(res.body)).not.toContain(guest.token);
    });

    it('is open without a deadline until the start', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.body.invitation.open).toBe(true);
    });

    it('reports open false after the deadline while the event is still upcoming', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada, { rsvpDeadline: inDays(5) });
      const guest = await addGuest(ada, event.id);
      await db
        .update(events)
        .set({ rsvpDeadline: new Date(Date.now() - day) })
        .where(eq(events.id, event.id));
      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.body.invitation).toMatchObject({ past: false, open: false });
      expect(res.body.invitation.event.description).toBe('<p>Bring food</p>');
    });

    it('reports open false once a running event has started and has no deadline', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makeRunning(event.id);
      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.body.invitation).toMatchObject({ past: false, open: false });
    });

    it('shows the own answer of the guest', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await request(app)
        .put(`${rsvp}/${guest.token}`)
        .send({ response: 'accepted', companions: 1, message: 'See you' })
        .expect(200);
      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.body.invitation.guest).toEqual({
        name: 'Grace',
        maxCompanions: 2,
        response: 'accepted',
        companions: 1,
        message: 'See you',
        respondedAt: expect.any(String),
      });
    });

    it('shows only the title once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makePast(event.id);
      const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body).toEqual({ invitation: { past: true, event: { title: 'Summer party' } } });
    });

    describe('hosts', () => {
      it('lists the names of members who set one, owner first, never emails', async () => {
        const owner = await namedAgent('owner@example.com', 'Olivia');
        const noName = await signedUpAgent('noname@example.com');
        const editor = await namedAgent('editor@example.com', 'Ed');
        const event = await createEvent(owner);
        // the editor joins before the one without a name, the owner is still first
        await addEditor(event.id, editor);
        await addEditor(event.id, noName);
        const guest = await addGuest(owner, event.id);

        const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
        expect(res.body.invitation.event.hosts).toEqual(['Olivia', 'Ed']);
        expect(JSON.stringify(res.body)).not.toContain('@example.com');
      });

      it('is empty when nobody has a name', async () => {
        const owner = await signedUpAgent('owner@example.com');
        const event = await createEvent(owner);
        const guest = await addGuest(owner, event.id);
        const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
        expect(res.body.invitation.event.hosts).toEqual([]);
      });

      it('lists an editor with a name when the owner has none', async () => {
        const owner = await signedUpAgent('owner@example.com');
        const editor = await namedAgent('editor@example.com', 'Ed');
        const event = await createEvent(owner);
        await addEditor(event.id, editor);
        const guest = await addGuest(owner, event.id);
        const res = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
        expect(res.body.invitation.event.hosts).toEqual(['Ed']);
      });
    });

    describe('invalid tokens', () => {
      it('answers the same 404 for unknown, malformed, renewed and removed tokens', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const renewed = await addGuest(ada, event.id);
        const removed = await addGuest(ada, event.id, { name: 'Gone' });
        await ada.post(`${base}/${event.id}/guests/${renewed.id}/token`).expect(200);
        await ada.delete(`${base}/${event.id}/guests/${removed.id}`).expect(204);

        const tokens = ['a'.repeat(43), 'abc', renewed.token, removed.token, `${'a'.repeat(42)}!`];
        const bodies = [];
        for (const token of tokens) {
          const get = await request(app).get(`${rsvp}/${token}`).expect(404);
          const put = await request(app)
            .put(`${rsvp}/${token}`)
            .send({ response: 'accepted' })
            .expect(404);
          bodies.push(get.body, put.body);
        }
        for (const body of bodies) {
          expect(body).toEqual(bodies[0]);
          expect(body).toEqual({ error: { message: expect.any(String) } });
        }
      });
    });
  });

  describe('PUT /rsvp/:token', () => {
    it('accepts with companions and a message, answeredBy guest', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);

      const res = await request(app)
        .put(`${rsvp}/${guest.token}`)
        .send({ response: 'accepted', companions: 2, message: ' Looking forward ' })
        .expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body.invitation).toMatchObject({
        past: false,
        open: true,
        guest: {
          response: 'accepted',
          companions: 2,
          message: 'Looking forward',
          respondedAt: expect.any(String),
        },
      });

      const list = await ada.get(`${base}/${event.id}/guests`).expect(200);
      expect(list.body.guests[0]).toMatchObject({
        response: 'accepted',
        companions: 2,
        message: 'Looking forward',
        answeredBy: 'guest',
      });
    });

    it('defaults companions to 0 and the message to null, an empty message is null', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      const res = await request(app)
        .put(`${rsvp}/${guest.token}`)
        .send({ response: 'accepted', message: '  ' })
        .expect(200);
      expect(res.body.invitation.guest).toMatchObject({ companions: 0, message: null });
    });

    it('sets companions to 0 on decline', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      const res = await request(app)
        .put(`${rsvp}/${guest.token}`)
        .send({ response: 'declined', companions: 2 })
        .expect(200);
      expect(res.body.invitation.guest).toMatchObject({ response: 'declined', companions: 0 });
    });

    it('can change the answer, and replaces the answer a host recorded', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await ada
        .put(`${base}/${event.id}/guests/${guest.id}/response`)
        .send({ response: 'declined' })
        .expect(200);
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(200);
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'declined' }).expect(200);
      const list = await ada.get(`${base}/${event.id}/guests`).expect(200);
      expect(list.body.guests[0]).toMatchObject({ response: 'declined', answeredBy: 'guest' });
    });

    it('answers 400 with details for bad input', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id, { maxCompanions: 10 });
      const url = `${rsvp}/${guest.token}`;

      let res = await request(app).put(url).send({}).expect(400);
      expect(detailPaths(res)).toContain('response');
      res = await request(app).put(url).send({ response: 'pending' }).expect(400);
      expect(detailPaths(res)).toContain('response');
      res = await request(app).put(url).send({ response: 'accepted', companions: 11 }).expect(400);
      expect(detailPaths(res)).toContain('companions');
      res = await request(app).put(url).send({ response: 'accepted', companions: -1 }).expect(400);
      expect(detailPaths(res)).toContain('companions');
      res = await request(app).put(url).send({ response: 'accepted', companions: 1.5 }).expect(400);
      expect(detailPaths(res)).toContain('companions');
      res = await request(app)
        .put(url)
        .send({ response: 'accepted', message: 'm'.repeat(501) })
        .expect(400);
      expect(detailPaths(res)).toContain('message');
    });

    it('answers 400 with path companions above the allowance and changes nothing', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id, { maxCompanions: 1 });
      const res = await request(app)
        .put(`${rsvp}/${guest.token}`)
        .send({ response: 'accepted', companions: 2 })
        .expect(400);
      expect(detailPaths(res)).toContain('companions');
      const [row] = await db.select().from(guests).where(eq(guests.id, guest.id));
      expect(row).toMatchObject({ response: 'pending', companions: 0 });
    });

    it('answers 409 after the deadline', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada, { rsvpDeadline: inDays(5) });
      const guest = await addGuest(ada, event.id);
      await db
        .update(events)
        .set({ rsvpDeadline: new Date(Date.now() - day) })
        .where(eq(events.id, event.id));
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(409);
      const [row] = await db.select().from(guests).where(eq(guests.id, guest.id));
      expect(row?.response).toBe('pending');
    });

    it('stays open until the deadline even when it is after nothing else', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada, { rsvpDeadline: inDays(5) });
      const guest = await addGuest(ada, event.id);
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(200);
    });

    it('answers 409 once the event has started and there is no deadline', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makeRunning(event.id);
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(409);
    });

    it('answers 409 on a past event, also with a deadline in the future', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makePast(event.id);
      await db
        .update(events)
        .set({ rsvpDeadline: new Date(Date.now() + day) })
        .where(eq(events.id, event.id));
      await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(409);
    });
  });

  describe('request log', () => {
    it('does not contain the token of the link', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);

      // the log level is silent in tests: raise it and watch what is written to the stream
      const stream = (logger as unknown as Record<symbol, { write: (chunk: string) => unknown }>)[
        pino.symbols.streamSym
      ]!;
      const write = vi.spyOn(stream, 'write').mockImplementation(() => true);
      const level = logger.level;
      logger.level = 'info';
      try {
        await request(app).get(`${rsvp}/${guest.token}`).expect(200);
        await request(app).put(`${rsvp}/${guest.token}`).send({ response: 'accepted' }).expect(200);
        await request(app).get(`${rsvp}/${guest.token}/images/${unknownId}`).expect(404);
      } finally {
        logger.level = level;
      }

      const lines = write.mock.calls.map((call) => String(call[0]));
      write.mockRestore();
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join('')).toContain('[token]');
      expect(lines.join('')).not.toContain(guest.token);
    });
  });

  describe('GET /rsvp/:token/images/:imageId', () => {
    async function uploadImage(agent: Agent, eventId: string) {
      const res = await agent
        .post(`${base}/${eventId}/images`)
        .attach('images', await png(), 'a.png')
        .expect(201);
      return res.body.images[0].id as string;
    }

    it('serves an image of the event without a session', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const imageId = await uploadImage(ada, event.id);
      const guest = await addGuest(ada, event.id);

      const invitation = await request(app).get(`${rsvp}/${guest.token}`).expect(200);
      expect(invitation.body.invitation.event.images).toEqual([
        { id: imageId, width: expect.any(Number), height: expect.any(Number), position: 0 },
      ]);

      const res = await request(app).get(`${rsvp}/${guest.token}/images/${imageId}`).expect(200);
      expect(res.headers['content-type']).toContain('image/');
      expect(res.headers['cache-control']).toBe('private, no-cache');
    });

    it('answers 404 for an unknown image and for an image of another event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const other = await createEvent(ada);
      const otherImage = await uploadImage(ada, other.id);
      const guest = await addGuest(ada, event.id);

      await request(app).get(`${rsvp}/${guest.token}/images/${unknownId}`).expect(404);
      await request(app).get(`${rsvp}/${guest.token}/images/${otherImage}`).expect(404);
    });

    it('answers 404 for unknown, malformed, renewed and removed tokens', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const imageId = await uploadImage(ada, event.id);
      const renewed = await addGuest(ada, event.id);
      const removed = await addGuest(ada, event.id, { name: 'Gone' });
      await ada.post(`${base}/${event.id}/guests/${renewed.id}/token`).expect(200);
      await ada.delete(`${base}/${event.id}/guests/${removed.id}`).expect(204);

      for (const token of ['a'.repeat(43), 'abc', renewed.token, removed.token]) {
        await request(app).get(`${rsvp}/${token}/images/${imageId}`).expect(404);
      }
      await request(app).get(`${rsvp}/${renewed.token}/images/nope`).expect(404);
    });

    it('answers 404 once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const imageId = await uploadImage(ada, event.id);
      const guest = await addGuest(ada, event.id);
      await makePast(event.id);
      await request(app).get(`${rsvp}/${guest.token}/images/${imageId}`).expect(404);
    });
  });

  describe('GET /rsvp/:token/calendar', () => {
    it('serves the calendar file with place name and address, without a session', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);

      const res = await request(app).get(`${rsvp}/${guest.token}/calendar`).expect(200);
      expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('event.ics');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.text).toContain('BEGIN:VCALENDAR\r\n');
      expect(res.text).toContain(`UID:${event.id}@vyte\r\n`);
      expect(res.text).toContain('SUMMARY:Summer party\r\n');
      expect(res.text).toContain('LOCATION:Garden\\, Main street 1\r\n');
      expect(res.text).not.toContain(guest.token);
      expect(res.text).not.toContain('Grace');
    });

    it('has the address alone, or no LOCATION without place and address', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const onlyAddress = await createEvent(ada, { locationName: null });
      const none = await createEvent(ada, { locationName: null, address: null });
      const a = await addGuest(ada, onlyAddress.id);
      const b = await addGuest(ada, none.id);

      const withAddress = await request(app).get(`${rsvp}/${a.token}/calendar`).expect(200);
      expect(withAddress.text).toContain('LOCATION:Main street 1\r\n');
      const without = await request(app).get(`${rsvp}/${b.token}/calendar`).expect(200);
      expect(without.text).not.toContain('LOCATION');
    });

    it('works while the event is running', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makeRunning(event.id);
      await request(app).get(`${rsvp}/${guest.token}/calendar`).expect(200);
    });

    it('answers 404 once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await makePast(event.id);
      const res = await request(app).get(`${rsvp}/${guest.token}/calendar`).expect(404);
      const other = await request(app)
        .get(`${rsvp}/${'a'.repeat(43)}/calendar`)
        .expect(404);
      expect(res.body).toEqual(other.body);
    });

    it('answers the same 404 for unknown, malformed, renewed and removed tokens', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const renewed = await addGuest(ada, event.id);
      const removed = await addGuest(ada, event.id, { name: 'Gone' });
      await ada.post(`${base}/${event.id}/guests/${renewed.id}/token`).expect(200);
      await ada.delete(`${base}/${event.id}/guests/${removed.id}`).expect(204);

      const bodies = [];
      for (const token of ['a'.repeat(43), 'abc', renewed.token, removed.token]) {
        bodies.push((await request(app).get(`${rsvp}/${token}/calendar`).expect(404)).body);
      }
      for (const body of bodies) expect(body).toEqual(bodies[0]);
    });
  });
});
