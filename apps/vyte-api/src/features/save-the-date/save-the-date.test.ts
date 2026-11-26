import { db } from '@server/core/db/db';
import { saveTheDateSchema } from '@vyte/contracts/events';
import { eq } from 'drizzle-orm';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { apiPrefix } from '../../shared/api.js';
import { app, signedUpAgent } from '../../test/helpers.js';
import { eventMembers, events } from '../events/events.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const link = `${apiPrefix}/save-the-date`;
const day = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();
const unknownId = '00000000-0000-4000-8000-000000000000';
const secretAddress = 'Secret lane 42';

async function createEvent(agent: Agent, extra: Record<string, unknown> = {}) {
  const res = await agent
    .post(base)
    .send({
      title: 'Summer party',
      description: '<p>Secret description</p>',
      locationName: 'Garden',
      address: secretAddress,
      startsAt: inDays(60),
      timeZone: 'Europe/Berlin',
      ...extra,
    })
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

async function turnOn(agent: Agent, eventId: string, body: Record<string, unknown> = {}) {
  const res = await agent.put(`${base}/${eventId}/save-the-date`).send(body).expect(200);
  return res.body.event.saveTheDate as { token: string; note: string | null };
}

/** `saveTheDateSchema` is a union, so each variant is made strict here. */
function strictSaveTheDate(value: unknown) {
  const [open, past] = saveTheDateSchema.options;
  return ((value as { past?: boolean })?.past ? past : open).strict().safeParse(value);
}

function png() {
  return sharp({ create: { width: 400, height: 200, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
}

function detailPaths(res: request.Response): string[] {
  return res.body.error.details.map((detail: { path: string }) => detail.path);
}

describe('save the date', () => {
  describe('host routes', () => {
    it('answer 401 without a session', async () => {
      await request(app).put(`${base}/${unknownId}/save-the-date`).send({}).expect(401);
      await request(app).delete(`${base}/${unknownId}/save-the-date`).expect(401);
      await request(app).post(`${base}/${unknownId}/save-the-date/token`).expect(401);
    });

    describe('PUT /events/:id/save-the-date', () => {
      it('turns it on with a link and the note, answering the event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);

        const res = await ada
          .put(`${base}/${event.id}/save-the-date`)
          .send({ note: '  Invitation follows  ' })
          .expect(200);
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.body.event.id).toBe(event.id);
        expect(res.body.event.role).toBe('owner');
        expect(res.body.event.saveTheDate).toEqual({
          token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          note: 'Invitation follows',
        });

        const read = await ada.get(`${base}/${event.id}`).expect(200);
        expect(read.body.event.saveTheDate).toEqual(res.body.event.saveTheDate);
      });

      it('turns it on without a body note, the note being null', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        expect((await turnOn(ada, event.id)).note).toBeNull();
      });

      it('keeps the link on later calls and updates the note', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const first = await turnOn(ada, event.id, { note: 'One' });
        const second = await turnOn(ada, event.id, { note: 'Two' });
        expect(second).toEqual({ token: first.token, note: 'Two' });
      });

      it('turns an empty note into null', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const first = await turnOn(ada, event.id, { note: 'One' });
        for (const note of ['', '   ', null]) {
          await turnOn(ada, event.id, { note: 'One' });
          const result = await turnOn(ada, event.id, { note });
          expect(result).toEqual({ token: first.token, note: null });
        }
      });

      it('lets an editor turn it on', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const event = await createEvent(ada);
        await addEditor(event.id, grace);

        const res = await grace
          .put(`${base}/${event.id}/save-the-date`)
          .send({ note: 'By Grace' })
          .expect(200);
        expect(res.body.event.role).toBe('editor');
        expect(res.body.event.saveTheDate.note).toBe('By Grace');
        const owner = await ada.get(`${base}/${event.id}`).expect(200);
        expect(owner.body.event.saveTheDate).toEqual(res.body.event.saveTheDate);
      });

      it('answers 400 with details for bad input', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const tooLong = await ada
          .put(`${base}/${event.id}/save-the-date`)
          .send({ note: 'x'.repeat(501) })
          .expect(400);
        expect(detailPaths(tooLong)).toEqual(['note']);
        const wrongType = await ada
          .put(`${base}/${event.id}/save-the-date`)
          .send({ note: 5 })
          .expect(400);
        expect(detailPaths(wrongType)).toEqual(['note']);
        await ada.put(`${base}/not-a-uuid/save-the-date`).send({}).expect(400);
      });

      it('accepts a note of the maximum length', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const result = await turnOn(ada, event.id, { note: 'x'.repeat(500) });
        expect(result.note).toHaveLength(500);
      });

      it('answers 404 for an unknown event and for a non-member', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const mallory = await signedUpAgent('mallory@example.com');
        const event = await createEvent(ada);
        await ada.put(`${base}/${unknownId}/save-the-date`).send({}).expect(404);
        await mallory.put(`${base}/${event.id}/save-the-date`).send({}).expect(404);
        const read = await ada.get(`${base}/${event.id}`).expect(200);
        expect(read.body.event.saveTheDate).toBeNull();
      });

      it('answers 409 for an event that is over', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        await makePast(event.id);
        await ada.put(`${base}/${event.id}/save-the-date`).send({}).expect(409);
      });
    });

    describe('DELETE /events/:id/save-the-date', () => {
      it('turns it off: no link in the event, the old link answers 404', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const on = await turnOn(ada, event.id, { note: 'Keep me' });
        await request(app).get(`${link}/${on.token}`).expect(200);

        const res = await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.body.event.saveTheDate).toBeNull();
        await request(app).get(`${link}/${on.token}`).expect(404);
        await request(app).get(`${link}/${on.token}/calendar`).expect(404);
        await request(app).get(`${link}/${on.token}/cover`).expect(404);
      });

      it('is fine when it is already off', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const res = await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
        expect(res.body.event.saveTheDate).toBeNull();
      });

      it('creates a new link when turned on again, the old one staying 404', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const first = await turnOn(ada, event.id, { note: 'Hello' });
        await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
        const second = await turnOn(ada, event.id, { note: 'Hello again' });

        expect(second.token).not.toBe(first.token);
        await request(app).get(`${link}/${first.token}`).expect(404);
        await request(app).get(`${link}/${second.token}`).expect(200);
      });

      it('lets an editor turn it off', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const event = await createEvent(ada);
        await addEditor(event.id, grace);
        await turnOn(ada, event.id);
        const res = await grace.delete(`${base}/${event.id}/save-the-date`).expect(200);
        expect(res.body.event.saveTheDate).toBeNull();
      });

      it('answers 404 for a non-member', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const mallory = await signedUpAgent('mallory@example.com');
        const event = await createEvent(ada);
        const on = await turnOn(ada, event.id);
        await mallory.delete(`${base}/${event.id}/save-the-date`).expect(404);
        await request(app).get(`${link}/${on.token}`).expect(200);
      });

      it('still works after the event: link off, note cleared', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const on = await turnOn(ada, event.id, { note: 'Old' });
        await makePast(event.id);

        const res = await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
        expect(res.body.event.saveTheDate).toBeNull();
        expect(res.body.event.past).toBe(true);
        await request(app).get(`${link}/${on.token}`).expect(404);
        const [row] = await db.select().from(events).where(eq(events.id, event.id));
        expect(row!.saveTheDateToken).toBeNull();
        expect(row!.saveTheDateNote).toBeNull();
      });

      it('answers 409 for turning it on after the event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        await makePast(event.id);
        await ada.put(`${base}/${event.id}/save-the-date`).send({}).expect(409);
      });
    });

    describe('POST /events/:id/save-the-date/token', () => {
      it('renews the link, the old one answering 404', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        const first = await turnOn(ada, event.id, { note: 'Note' });

        const res = await ada.post(`${base}/${event.id}/save-the-date/token`).expect(200);
        expect(res.headers['cache-control']).toContain('no-store');
        const renewed = res.body.event.saveTheDate;
        expect(renewed.token).not.toBe(first.token);
        expect(renewed.note).toBe('Note');
        await request(app).get(`${link}/${first.token}`).expect(404);
        await request(app).get(`${link}/${renewed.token}`).expect(200);
      });

      it('answers 404 while it is off', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const event = await createEvent(ada);
        await ada.post(`${base}/${event.id}/save-the-date/token`).expect(404);
        await turnOn(ada, event.id);
        await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
        await ada.post(`${base}/${event.id}/save-the-date/token`).expect(404);
      });

      it('lets an editor renew, answers 404 for a non-member and 409 when over', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const mallory = await signedUpAgent('mallory@example.com');
        const event = await createEvent(ada);
        await addEditor(event.id, grace);
        await turnOn(ada, event.id);

        await grace.post(`${base}/${event.id}/save-the-date/token`).expect(200);
        await mallory.post(`${base}/${event.id}/save-the-date/token`).expect(404);
        await ada.post(`${base}/${unknownId}/save-the-date/token`).expect(404);
        await makePast(event.id);
        await ada.post(`${base}/${event.id}/save-the-date/token`).expect(409);
      });
    });
  });

  describe('GET /save-the-date/:token', () => {
    it('shows the date without a session, with the full shape', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const startsAt = inDays(60);
      const endsAt = inDays(61);
      const event = await createEvent(ada, { startsAt, endsAt });
      const on = await turnOn(ada, event.id, { note: 'Save it' });

      const res = await request(app).get(`${link}/${on.token}`).expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body).toEqual({
        saveTheDate: {
          past: false,
          title: 'Summer party',
          allDay: false,
          startsAt,
          endsAt,
          timeZone: 'Europe/Berlin',
          locationName: 'Garden',
          note: 'Save it',
          cover: null,
        },
      });
      expect(strictSaveTheDate(res.body.saveTheDate).error).toBeUndefined();
    });

    it('has null for place and note when there are none', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada, { locationName: null, address: null });
      const on = await turnOn(ada, event.id);
      const res = await request(app).get(`${link}/${on.token}`).expect(200);
      expect(res.body.saveTheDate.locationName).toBeNull();
      expect(res.body.saveTheDate.note).toBeNull();
    });

    it('starts without a note when turned on again after off', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await turnOn(ada, event.id, { note: 'Cleared' });
      await ada.delete(`${base}/${event.id}/save-the-date`).expect(200);
      const on = await turnOn(ada, event.id);
      expect(on.note).toBeNull();
      const res = await request(app).get(`${link}/${on.token}`).expect(200);
      expect(res.body.saveTheDate.note).toBeNull();
    });

    it('shows the size of the first image as cover', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await ada
        .post(`${base}/${event.id}/images`)
        .attach('images', await png(), 'a.png')
        .expect(201);
      const on = await turnOn(ada, event.id);
      const res = await request(app).get(`${link}/${on.token}`).expect(200);
      expect(res.body.saveTheDate.cover).toEqual({
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('never contains the address, the description, names or emails', async () => {
      const ada = await signedUpAgent('ada@example.com');
      await ada.patch(`${apiPrefix}/auth/me`).send({ name: 'Ada Lovelace' });
      const event = await createEvent(ada);
      const on = await turnOn(ada, event.id, { note: 'Note' });

      for (const path of ['', '/calendar']) {
        const res = await request(app).get(`${link}/${on.token}${path}`).expect(200);
        const body = res.text;
        expect(body).not.toContain(secretAddress);
        expect(body).not.toContain('Secret description');
        expect(body).not.toContain('ada@example.com');
        expect(body).not.toContain('Ada');
        expect(body).not.toContain('Lovelace');
        expect(body).not.toContain(on.token);
      }
    });

    it('shows only the title once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const on = await turnOn(ada, event.id, { note: 'Note' });
      await makePast(event.id);

      const res = await request(app).get(`${link}/${on.token}`).expect(200);
      expect(res.body).toEqual({ saveTheDate: { past: true, title: 'Summer party' } });
      expect(strictSaveTheDate(res.body.saveTheDate).error).toBeUndefined();
    });

    it('answers the same 404 for unknown, malformed, renewed and turned-off links', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const renewedEvent = await createEvent(ada);
      const offEvent = await createEvent(ada);
      const renewed = await turnOn(ada, renewedEvent.id);
      const off = await turnOn(ada, offEvent.id);
      await ada.post(`${base}/${renewedEvent.id}/save-the-date/token`).expect(200);
      await ada.delete(`${base}/${offEvent.id}/save-the-date`).expect(200);

      const tokens = ['a'.repeat(43), 'abc', renewed.token, off.token, `${'a'.repeat(42)}!`];
      const bodies = [];
      for (const token of tokens) {
        for (const path of ['', '/calendar', '/cover']) {
          const res = await request(app).get(`${link}/${token}${path}`).expect(404);
          bodies.push(res.body);
        }
      }
      for (const body of bodies) {
        expect(body).toEqual(bodies[0]);
        expect(body).toEqual({ error: { message: expect.any(String) } });
      }
    });
  });

  describe('GET /save-the-date/:token/calendar', () => {
    it('serves the file with the place name only', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const on = await turnOn(ada, event.id);

      const res = await request(app).get(`${link}/${on.token}/calendar`).expect(200);
      expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('event.ics');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
      expect(res.text).toContain(`UID:${event.id}@vyte\r\n`);
      expect(res.text).toContain('SUMMARY:Summer party\r\n');
      expect(res.text).toContain('LOCATION:Garden\r\n');
      expect(res.text).not.toContain(secretAddress);
    });

    it('has no LOCATION without a place name, even with an address', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada, { locationName: null });
      const on = await turnOn(ada, event.id);
      const res = await request(app).get(`${link}/${on.token}/calendar`).expect(200);
      expect(res.text).not.toContain('LOCATION');
      expect(res.text).not.toContain(secretAddress);
    });

    it('answers 404 once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const on = await turnOn(ada, event.id);
      await makePast(event.id);
      await request(app).get(`${link}/${on.token}/calendar`).expect(404);
    });
  });

  describe('GET /save-the-date/:token/cover', () => {
    async function upload(agent: Agent, eventId: string, count: number) {
      let req = agent.post(`${base}/${eventId}/images`);
      const file = await png();
      for (let i = 0; i < count; i++) req = req.attach('images', file, `${i}.png`);
      await req.expect(201);
    }

    it('serves the image at position 0 without a session', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id, 2);
      const on = await turnOn(ada, event.id);

      const first = await request(app).get(`${link}/${on.token}/cover`).expect(200);
      expect(first.headers['content-type']).toContain('image/');
      expect(first.headers['cache-control']).toBe('private, no-cache');
    });

    it('serves the new first image after the order changed', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id, 2);
      const on = await turnOn(ada, event.id);
      const before = await request(app).get(`${link}/${on.token}/cover`).expect(200);

      const images = (await ada.get(`${base}/${event.id}`)).body.event.images as { id: string }[];
      await ada
        .put(`${base}/${event.id}/images/order`)
        .send({ ids: [images[1]!.id, images[0]!.id] })
        .expect(200);
      const after = await request(app).get(`${link}/${on.token}/cover`).expect(200);
      const second = await ada.get(`${base}/${event.id}/images/${images[1]!.id}`).expect(200);
      expect(Buffer.from(after.body).equals(Buffer.from(second.body))).toBe(true);
      expect(before.status).toBe(200);
    });

    it('answers 404 without images and once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bare = await createEvent(ada);
      const withImage = await createEvent(ada);
      await upload(ada, withImage.id, 1);
      const bareLink = await turnOn(ada, bare.id);
      const imageLink = await turnOn(ada, withImage.id);

      await request(app).get(`${link}/${bareLink.token}/cover`).expect(404);
      await request(app).get(`${link}/${imageLink.token}/cover`).expect(200);
      await makePast(withImage.id);
      await request(app).get(`${link}/${imageLink.token}/cover`).expect(404);
    });
  });

  describe('GET /save-the-date/:token/preview', () => {
    const binary = (
      response: request.Response,
      done: (error: Error | null, body: Buffer) => void,
    ) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => done(null, Buffer.concat(chunks)));
    };

    const linkToken = async (agent: Agent, eventId: string) => (await turnOn(agent, eventId)).token;

    async function upload(
      agent: Agent,
      eventId: string,
      width = 400,
      height = 200,
      background = 'blue',
    ) {
      const file = await sharp({ create: { width, height, channels: 3, background } })
        .png()
        .toBuffer();
      await agent.post(`${base}/${eventId}/images`).attach('images', file, 'a.png').expect(201);
    }

    async function expectPreview(token: string) {
      const res = await request(app)
        .get(`${link}/${token}/preview`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.headers['cache-control']).toBe('private, no-cache');
      const meta = await sharp(res.body as Buffer).metadata();
      expect(meta).toMatchObject({ format: 'jpeg', width: 1200, height: 630 });
    }

    it('serves the cover as a 1200x630 JPEG without a session', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id);
      const on = await turnOn(ada, event.id);
      await expectPreview(on.token);
    });

    it('cuts a small and a portrait image to the same size', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const small = await createEvent(ada);
      const portrait = await createEvent(ada);
      await upload(ada, small.id, 50, 30);
      await upload(ada, portrait.id, 200, 600);
      await expectPreview((await turnOn(ada, small.id)).token);
      await expectPreview((await turnOn(ada, portrait.id)).token);
    });

    it('answers 404 without an image', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const on = await turnOn(ada, event.id);
      await request(app).get(`${link}/${on.token}/preview`).expect(404);
    });

    it('answers 404 for unknown, malformed, renewed and turned-off links', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const renewedEvent = await createEvent(ada);
      const offEvent = await createEvent(ada);
      await upload(ada, renewedEvent.id);
      await upload(ada, offEvent.id);
      const renewed = await turnOn(ada, renewedEvent.id);
      const off = await turnOn(ada, offEvent.id);
      await ada.post(`${base}/${renewedEvent.id}/save-the-date/token`).expect(200);
      await ada.delete(`${base}/${offEvent.id}/save-the-date`).expect(200);

      for (const token of ['a'.repeat(43), 'abc', renewed.token, off.token]) {
        await request(app).get(`${link}/${token}/preview`).expect(404);
      }
    });

    it('answers 404 once the event is over', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id);
      const on = await turnOn(ada, event.id);
      await expectPreview(on.token);
      await makePast(event.id);
      await request(app).get(`${link}/${on.token}/preview`).expect(404);
    });

    it('answers 404 with the common message for bad tokens', async () => {
      for (const token of ['a'.repeat(43), 'abc']) {
        const res = await request(app).get(`${link}/${token}/preview`).expect(404);
        expect(res.body).toEqual({ error: { message: 'Save the date not found' } });
      }
    });

    it('answers two parallel requests with the same image', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id);
      const token = await linkToken(ada, event.id);
      const [one, two] = await Promise.all(
        [1, 2].map(() => request(app).get(`${link}/${token}/preview`).buffer(true).parse(binary)),
      );
      expect(one!.status).toBe(200);
      expect(two!.status).toBe(200);
      expect((one!.body as Buffer).equals(two!.body as Buffer)).toBe(true);
    });

    it('answers 404, not 500, when the file is gone but the row is still there', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id);
      const token = await linkToken(ada, event.id);
      for (const file of await readdir(config.uploads.dir)) {
        await rm(path.join(config.uploads.dir, file));
      }
      await request(app).get(`${link}/${token}/preview`).expect(404);
    });

    it('follows the cover when it is reordered or deleted, never a stale render', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      await upload(ada, event.id, 400, 200, 'red');
      await upload(ada, event.id, 400, 200, 'blue');
      const token = await linkToken(ada, event.id);
      const ids = (await ada.get(`${base}/${event.id}`)).body.event.images.map(
        (image: { id: string }) => image.id,
      ) as string[];
      const fetchPreview = async () =>
        (await request(app).get(`${link}/${token}/preview`).buffer(true).parse(binary).expect(200))
          .body as Buffer;
      const dominant = async (data: Buffer) => (await sharp(data).stats()).dominant;

      const first = await fetchPreview();
      expect((await dominant(first)).r).toBeGreaterThan(200);

      await ada
        .put(`${base}/${event.id}/images/order`)
        .send({ ids: [ids[1], ids[0]] })
        .expect(200);
      const second = await fetchPreview();
      expect((await dominant(second)).b).toBeGreaterThan(200);

      await ada.delete(`${base}/${event.id}/images/${ids[1]}`).expect(200);
      const third = await fetchPreview();
      expect((await dominant(third)).r).toBeGreaterThan(200);

      await ada.delete(`${base}/${event.id}/images/${ids[0]}`).expect(200);
      await request(app).get(`${link}/${token}/preview`).expect(404);
    });
  });

  describe('caching of answers that carry the link', () => {
    it('sends no-store for the event routes', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const created = await ada
        .post(base)
        .send({ title: 'Party', startsAt: inDays(10), timeZone: 'Europe/Berlin' })
        .expect(201);
      expect(created.headers['cache-control']).toContain('no-store');
      const id = created.body.event.id as string;
      await turnOn(ada, id);

      const list = await ada.get(base).expect(200);
      expect(list.headers['cache-control']).toContain('no-store');
      const read = await ada.get(`${base}/${id}`).expect(200);
      expect(read.headers['cache-control']).toContain('no-store');
      const patched = await ada.patch(`${base}/${id}`).send({ title: 'Party 2' }).expect(200);
      expect(patched.headers['cache-control']).toContain('no-store');
    });

    it('sends no-store when accepting an editor invite', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const grace = await signedUpAgent('grace@example.com');
      const event = await createEvent(ada);
      const invite = await ada.post(`${base}/${event.id}/invites`).expect(201);
      const res = await grace
        .post(`${apiPrefix}/invites/${invite.body.invite.token}/accept`)
        .expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('sends no-store on signing up through an editor invite, which answers with the event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const invite = await ada.post(`${base}/${event.id}/invites`).expect(201);
      const res = await request(app)
        .post(`${apiPrefix}/invites/${invite.body.invite.token}/sign-up`)
        .send({ email: 'new@example.com', password: 'correct-horse', name: 'New' })
        .expect(201);
      expect(res.headers['cache-control']).toContain('no-store');
    });

    it('keeps the long cache for the image file route', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const event = await createEvent(ada);
      const up = await ada
        .post(`${base}/${event.id}/images`)
        .attach('images', await png(), 'a.png')
        .expect(201);
      const res = await ada.get(`${base}/${event.id}/images/${up.body.images[0].id}`).expect(200);
      expect(res.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    });
  });
});
