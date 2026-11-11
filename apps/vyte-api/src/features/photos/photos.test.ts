import { db } from '@server/core/db/db';
import { eq } from 'drizzle-orm';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { apiPrefix } from '../../shared/api.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { parseZip } from '../../test/zip.js';
import { eventMembers, events } from '../events/events.table.js';
import { guests } from '../guests/guests.table.js';
import { eventPhotos } from './photos.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const link = `${apiPrefix}/photos`;
const stand = `${apiPrefix}/stand`;
const minute = 60 * 1000;
const day = 24 * 60 * minute;
const unknownId = '00000000-0000-4000-8000-000000000000';
const unknownToken = 'A'.repeat(43);
const COOKIE = 'vyte_stand_device';

async function createEvent(agent: Agent, extra: Record<string, unknown> = {}) {
  const res = await agent
    .post(base)
    .send({
      title: 'Summer party',
      startsAt: new Date(Date.now() + 10 * day).toISOString(),
      timeZone: 'Europe/Berlin',
      ...extra,
    })
    .expect(201);
  return res.body.event as { id: string };
}

/** Moves the event in time; the API refuses to create one in the past. */
async function setTimes(eventId: string, startsOffset: number, endsOffset: number) {
  await db
    .update(events)
    .set({
      startsAt: new Date(Date.now() + startsOffset),
      endsAt: new Date(Date.now() + endsOffset),
      allDay: false,
    })
    .where(eq(events.id, eventId));
}

/** An event that is running now: uploads are open. */
async function liveEvent(agent: Agent) {
  const event = await createEvent(agent);
  await setTimes(event.id, -60 * minute, 60 * minute);
  return event;
}

async function addGuest(agent: Agent, eventId: string, name = 'Grace') {
  const res = await agent.post(`${base}/${eventId}/guests`).send({ name }).expect(201);
  return res.body.guest as { id: string; token: string; photoToken: string };
}

async function turnOnStand(agent: Agent, eventId: string) {
  const res = await agent.put(`${base}/${eventId}/photo-stand`).expect(200);
  return res.body.event.photoStand.token as string;
}

async function userId(agent: Agent) {
  return (await agent.get(`${apiPrefix}/auth/me`).expect(200)).body.user.id as string;
}

async function addEditor(eventId: string, editor: Agent) {
  await db.insert(eventMembers).values({ eventId, userId: await userId(editor), role: 'editor' });
}

const png = () =>
  sharp({ create: { width: 400, height: 200, channels: 3, background: 'red' } })
    .png()
    .toBuffer();

const files = () => readdir(config.uploads.dir);
const rows = () => db.select().from(eventPhotos);

/** One photo through a guest's photo link. */
async function uploadAsGuest(token: string, status = 201) {
  return request(app)
    .post(`${link}/${token}`)
    .attach('photo', await png(), 'a.png')
    .expect(status);
}

/** The cookie header value of a response to `POST /stand/:token/device`, if it sets one. */
function setCookieOf(res: request.Response): string | undefined {
  const header = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
    c.startsWith(`${COOKIE}=`),
  );
  return header?.split(';')[0]!.slice(COOKIE.length + 1);
}

/** A phone gets its device id: `POST /stand/:token/device` without a cookie. */
async function newDevice(token: string) {
  const res = await request(app).post(`${stand}/${token}/device`).expect(204);
  const id = setCookieOf(res);
  expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
  return id!;
}

// the device a standing upload went through, for `deviceCookie`
const devices = new WeakMap<object, string>();

/**
 * One photo at the stand. `cookie` is the device id; without one the phone first gets a new
 * device. `cookie: null` sends no cookie at all (a script).
 */
async function uploadAtStand(
  token: string,
  { cookie, name, status = 201 }: { cookie?: string | null; name?: string; status?: number } = {},
) {
  const device = cookie === undefined ? await newDevice(token) : cookie;
  const req = request(app).post(`${stand}/${token}`);
  if (device) req.set('Cookie', `${COOKIE}=${device}`);
  if (name !== undefined) req.field('name', name);
  const res = await req.attach('photo', await png(), 'a.png').expect(status);
  if (device) devices.set(res, device);
  return res;
}

/** The device id an `uploadAtStand` went through. */
function deviceCookie(res: request.Response): string {
  const id = devices.get(res);
  expect(id).toBeDefined();
  return id!;
}

const binary = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
  });

function detailPaths(res: request.Response): string[] {
  return res.body.error.details.map((detail: { path: string }) => detail.path);
}

describe('photos', () => {
  describe('the photo link of a guest', () => {
    describe('GET /photos/:token', () => {
      it('shows the upload page with the full shape and no cache', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace Hopper');

        const res = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        const [row] = await db.select().from(events).where(eq(events.id, event.id));
        expect(res.body).toEqual({
          upload: {
            eventTitle: 'Summer party',
            guestName: 'Grace Hopper',
            photos: [],
            limit: 3,
            left: 3,
            open: true,
            opensAt: row!.startsAt.toISOString(),
            closesAt: new Date(row!.endsAt!.getTime() + 7 * day).toISOString(),
          },
        });
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.headers['referrer-policy']).toBe('no-referrer');
      });

      it('does not accept the answer link (token) as a photo link', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app).get(`${link}/${guest.token}`).expect(404);
        await request(app).get(`${apiPrefix}/rsvp/${guest.photoToken}`).expect(404);
      });
    });

    describe('POST /photos/:token', () => {
      it('stores one photo, scaled to the photo width, and answers 201 with the page', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace');

        const res = await uploadAsGuest(guest.photoToken);
        expect(res.body.upload).toMatchObject({
          eventTitle: 'Summer party',
          guestName: 'Grace',
          limit: 3,
          left: 2,
          open: true,
        });
        expect(res.body.upload.photos).toEqual([
          {
            id: expect.any(String),
            width: 200,
            height: 100,
            createdAt: expect.any(String),
          },
        ]);
        expect(res.headers['cache-control']).toContain('no-store');

        const stored = await rows();
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
          eventId: event.id,
          source: 'guest',
          guestId: guest.id,
          deviceId: null,
          uploaderName: 'Grace',
          hidden: false,
          width: 200,
          height: 100,
        });
        expect(await files()).toEqual([stored[0]!.filename]);
        // the page lists it too
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload.photos).toHaveLength(1);
        expect(page.body.upload.left).toBe(2);
      });

      it('does not set a device cookie', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const res = await uploadAsGuest(guest.photoToken);
        expect(res.headers['set-cookie']).toBeUndefined();
      });

      it('answers 400 for a file that is no image and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const res = await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('photo', Buffer.from('<?php echo 1;'), 'a.png')
          .expect(400);
        expect(res.body.error.message).toEqual(expect.any(String));
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('answers 400 for an SVG', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('photo', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'a.svg')
          .expect(400);
        expect(await files()).toEqual([]);
      });

      it('answers 400 without a file', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app).post(`${link}/${guest.photoToken}`).expect(400);
        await request(app).post(`${link}/${guest.photoToken}`).field('a', 'b').expect(400);
        expect(await rows()).toHaveLength(0);
      });

      it('answers 400 for a file in another field', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('file', await png(), 'a.png')
          .expect(400);
        expect(await files()).toEqual([]);
      });

      it('answers 400 for any extra text field and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app)
          .post(`${link}/${guest.photoToken}`)
          .field('name', 'Mallory')
          .attach('photo', await png(), 'a.png')
          .expect(400);
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('answers 400 for two files', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const image = await png();
        await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('photo', image, 'a.png')
          .attach('photo', image, 'b.png')
          .expect(400);
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('answers 413 for a file above the size limit and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('photo', Buffer.alloc(config.uploads.maxFileSizeMb * 1024 * 1024 + 1), 'a.png')
          .expect(413);
        expect(await files()).toEqual([]);
      });
    });

    describe('limits', () => {
      it('accepts the 3rd photo and refuses the 4th with 409', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        for (let i = 0; i < 3; i++) await uploadAsGuest(guest.photoToken);
        const res = await uploadAsGuest(guest.photoToken, 409);
        expect(res.body.error.message).toEqual(expect.any(String));
        expect(await rows()).toHaveLength(3);
        expect(await files()).toHaveLength(3);

        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload).toMatchObject({ left: 0, limit: 3 });
      });

      it('counts per guest, so another guest has their own limit', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const grace = await addGuest(agent, event.id, 'Grace');
        const alan = await addGuest(agent, event.id, 'Alan');
        for (let i = 0; i < 3; i++) await uploadAsGuest(grace.photoToken);
        await uploadAsGuest(grace.photoToken, 409);
        await uploadAsGuest(alan.photoToken);
      });

      it('frees a place when an own photo is deleted', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await uploadAsGuest(guest.photoToken);
        await uploadAsGuest(guest.photoToken);
        await uploadAsGuest(guest.photoToken);
        const page = (await request(app).get(`${link}/${guest.photoToken}`)).body;
        await request(app).delete(`${link}/${guest.photoToken}/${page.upload.photos[0].id}`);
        await uploadAsGuest(guest.photoToken);
        expect(await rows()).toHaveLength(3);
      });

      it('refuses at the limit of the event with 409', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await db.insert(eventPhotos).values(
          Array.from({ length: config.photos.maxPerEvent - 1 }, (_, i) => ({
            eventId: event.id,
            source: 'stand' as const,
            deviceId: `device-${i}`,
            filename: `missing-${i}.webp`,
            width: 10,
            height: 10,
          })),
        );
        await uploadAsGuest(guest.photoToken);
        await uploadAsGuest(guest.photoToken, 409);
        expect(await rows()).toHaveLength(config.photos.maxPerEvent);
        expect(await files()).toHaveLength(1);
      });

      it('lets five parallel uploads at the guest limit store at most 3 and remove the files of the losers', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const image = await png();
        const results = await Promise.all(
          Array.from({ length: 5 }, () =>
            request(app).post(`${link}/${guest.photoToken}`).attach('photo', image, 'a.png'),
          ),
        );
        const statuses = results.map((r) => r.status).sort();
        expect(statuses).toEqual([201, 201, 201, 409, 409]);
        const stored = await rows();
        expect(stored).toHaveLength(3);
        expect((await files()).sort()).toEqual(stored.map((r) => r.filename).sort());
      });

      it('lets parallel uploads of several guests at the event limit store at most the limit', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const people = await Promise.all(
          ['A', 'B', 'C', 'D'].map((name) => addGuest(agent, event.id, name)),
        );
        await db.insert(eventPhotos).values(
          Array.from({ length: config.photos.maxPerEvent - 2 }, (_, i) => ({
            eventId: event.id,
            source: 'stand' as const,
            deviceId: `device-${i}`,
            filename: `missing-${i}.webp`,
            width: 10,
            height: 10,
          })),
        );
        const image = await png();
        const results = await Promise.all(
          people.map((guest) =>
            request(app).post(`${link}/${guest.photoToken}`).attach('photo', image, 'a.png'),
          ),
        );
        expect(results.map((r) => r.status).sort()).toEqual([201, 201, 409, 409]);
        expect(await rows()).toHaveLength(config.photos.maxPerEvent);
        expect(await files()).toHaveLength(2);
      });
    });

    describe('the upload window', () => {
      it('is closed before the event starts: 409, and the page says so', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id);
        await uploadAsGuest(guest.photoToken, 409);
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload).toMatchObject({ open: false, left: 3 });
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('opens at the start of the event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id);
        await setTimes(event.id, 2 * minute, 3 * minute);
        await uploadAsGuest(guest.photoToken, 409);
        await setTimes(event.id, -minute, 3 * minute);
        await uploadAsGuest(guest.photoToken);
      });

      it('stays open after the end, up to 7 days', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id);
        await setTimes(event.id, -8 * day, -7 * day + 2 * minute);
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload.open).toBe(true);
        await uploadAsGuest(guest.photoToken);
      });

      it('closes 7 days after the end: 409', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id);
        await setTimes(event.id, -8 * day, -7 * day - 2 * minute);
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload.open).toBe(false);
        await uploadAsGuest(guest.photoToken, 409);
        expect(await files()).toEqual([]);
      });

      it('takes the end of the day for an event without an end', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const guest = await addGuest(agent, event.id);
        // started 10 days ago, no end: the day ended 9+ days ago, past the 7 day window
        await db
          .update(events)
          .set({ startsAt: new Date(Date.now() - 10 * day), endsAt: null })
          .where(eq(events.id, event.id));
        await uploadAsGuest(guest.photoToken, 409);
        // started 3 days ago: the window is open
        await db
          .update(events)
          .set({ startsAt: new Date(Date.now() - 3 * day), endsAt: null })
          .where(eq(events.id, event.id));
        await uploadAsGuest(guest.photoToken);
      });

      it('still lets a guest see and delete own photos after the window closed', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const up = await uploadAsGuest(guest.photoToken);
        const photoId = up.body.upload.photos[0].id;
        await setTimes(event.id, -20 * day, -10 * day);
        await request(app).get(`${link}/${guest.photoToken}/${photoId}`).expect(200);
        const res = await request(app).delete(`${link}/${guest.photoToken}/${photoId}`).expect(200);
        expect(res.body.upload).toMatchObject({ photos: [], open: false });
      });
    });

    describe('own photos', () => {
      it('serves an own photo as WebP with a private, revalidated cache', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const up = await uploadAsGuest(guest.photoToken);
        const photoId = up.body.upload.photos[0].id;
        const res = await binary(
          request(app).get(`${link}/${guest.photoToken}/${photoId}`).expect(200),
        );
        expect(res.headers['content-type']).toBe('image/webp');
        expect(res.headers['cache-control']).toBe('private, no-cache');
        const meta = await sharp(res.body as Buffer).metadata();
        expect(meta).toMatchObject({ format: 'webp', width: 200, height: 100 });
      });

      it('deletes an own photo, removes the file and answers the page', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const up = await uploadAsGuest(guest.photoToken);
        const photoId = up.body.upload.photos[0].id;
        const res = await request(app).delete(`${link}/${guest.photoToken}/${photoId}`).expect(200);
        expect(res.body.upload).toMatchObject({ photos: [], left: 3 });
        expect(res.headers['cache-control']).toContain('no-store');
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
        await request(app).get(`${link}/${guest.photoToken}/${photoId}`).expect(404);
      });

      it('answers 404 for an unknown photo and for a malformed photo id', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        await request(app).get(`${link}/${guest.photoToken}/${unknownId}`).expect(404);
        await request(app).delete(`${link}/${guest.photoToken}/${unknownId}`).expect(404);
        await request(app).get(`${link}/${guest.photoToken}/nope`).expect(404);
        await request(app).delete(`${link}/${guest.photoToken}/nope`).expect(404);
      });

      it('lets a guest see and delete only their own photos', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const grace = await addGuest(agent, event.id, 'Grace');
        const alan = await addGuest(agent, event.id, 'Alan');
        const graces = (await uploadAsGuest(grace.photoToken)).body.upload.photos[0].id;
        const alans = (await uploadAsGuest(alan.photoToken)).body.upload.photos[0].id;

        const page = await request(app).get(`${link}/${alan.photoToken}`).expect(200);
        expect(page.body.upload.photos.map((p: { id: string }) => p.id)).toEqual([alans]);
        await request(app).get(`${link}/${alan.photoToken}/${graces}`).expect(404);
        await request(app).delete(`${link}/${alan.photoToken}/${graces}`).expect(404);
        expect(await rows()).toHaveLength(2);
        expect(await files()).toHaveLength(2);
      });

      it('keeps a guest of event A away from the photos of event B', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const inA = await addGuest(agent, eventA.id, 'Grace');
        const inB = await addGuest(agent, eventB.id, 'Grace');
        const inBPhoto = (await uploadAsGuest(inB.photoToken)).body.upload.photos[0].id;

        const page = await request(app).get(`${link}/${inA.photoToken}`).expect(200);
        expect(page.body.upload.photos).toEqual([]);
        await request(app).get(`${link}/${inA.photoToken}/${inBPhoto}`).expect(404);
        await request(app).delete(`${link}/${inA.photoToken}/${inBPhoto}`).expect(404);
        expect(await rows()).toHaveLength(1);
      });

      it('keeps a guest away from photos of the stand', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const token = await turnOnStand(agent, event.id);
        const up = await uploadAtStand(token);
        const photoId = up.body.upload.photos[0].id;
        await request(app).get(`${link}/${guest.photoToken}/${photoId}`).expect(404);
        await request(app).delete(`${link}/${guest.photoToken}/${photoId}`).expect(404);
      });
    });

    describe('unknown, renewed and malformed links', () => {
      it('answer the same 404 on every route', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const up = await uploadAsGuest(guest.photoToken);
        const photoId = up.body.upload.photos[0].id;
        await agent.post(`${base}/${event.id}/guests/${guest.id}/photo-token`).expect(200);

        const image = await png();
        const answers = [] as request.Response[];
        for (const token of [guest.photoToken, unknownToken, 'short', 'x'.repeat(43) + '!']) {
          answers.push(
            await request(app).get(`${link}/${token}`).expect(404),
            await request(app).post(`${link}/${token}`).attach('photo', image, 'a.png').expect(404),
            await request(app).get(`${link}/${token}/${photoId}`).expect(404),
            await request(app).delete(`${link}/${token}/${photoId}`).expect(404),
          );
        }
        for (const answer of answers) expect(answer.body).toEqual(answers[0]!.body);
        expect(answers[0]!.body).toEqual({ error: { message: 'Upload not found' } });
        // nothing was stored by the refused posts, the first photo is still there
        expect(await rows()).toHaveLength(1);
        expect(await files()).toHaveLength(1);
      });
    });
  });

  describe('the photo stand', () => {
    describe('GET /stand/:token', () => {
      it('shows the page without a guest name, with the limit per device', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const res = await request(app).get(`${stand}/${token}`).expect(200);
        const [row] = await db.select().from(events).where(eq(events.id, event.id));
        expect(res.body).toEqual({
          upload: {
            eventTitle: 'Summer party',
            guestName: null,
            photos: [],
            limit: 3,
            left: 3,
            open: true,
            opensAt: row!.startsAt.toISOString(),
            closesAt: new Date(row!.endsAt!.getTime() + 7 * day).toISOString(),
          },
        });
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.headers['referrer-policy']).toBe('no-referrer');
        // reading sets no cookie
        expect(res.headers['set-cookie']).toBeUndefined();
      });
    });

    describe('POST /stand/:token', () => {
      it('stores a photo of the device and keeps the typed name, without a Set-Cookie', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = await newDevice(token);

        const res = await uploadAtStand(token, { cookie: device, name: ' Linus ' });
        expect(res.body.upload).toMatchObject({ guestName: null, left: 2, limit: 3 });
        expect(res.body.upload.photos).toHaveLength(1);
        expect(res.headers['cache-control']).toContain('no-store');
        expect(res.headers['set-cookie']).toBeUndefined();

        const [stored] = await rows();
        expect(stored).toMatchObject({
          source: 'stand',
          guestId: null,
          deviceId: device,
          uploaderName: 'Linus',
        });
      });

      it('answers 409 without the device cookie, also for a script, and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const res = await uploadAtStand(token, { cookie: null, status: 409 });
        expect(res.headers['set-cookie']).toBeUndefined();
        expect(res.body.error.message).toEqual(expect.any(String));
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('keeps a device across uploads and does not set the cookie again', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const first = await uploadAtStand(token);
        const device = deviceCookie(first);
        const second = await uploadAtStand(token, { cookie: device });
        expect(second.headers['set-cookie']).toBeUndefined();
        expect(second.body.upload.photos).toHaveLength(2);
        const page = await request(app)
          .get(`${stand}/${token}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(200);
        expect(page.body.upload).toMatchObject({ left: 1 });
        expect(page.body.upload.photos).toHaveLength(2);
      });

      it('reads the cookie among others', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = deviceCookie(await uploadAtStand(token));
        const page = await request(app)
          .get(`${stand}/${token}`)
          .set('Cookie', `sid=abc; ${COOKIE}=${device}; other=1`)
          .expect(200);
        expect(page.body.upload.photos).toHaveLength(1);
      });

      it('stores an empty or missing name as none', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await uploadAtStand(token, { name: '   ' });
        await uploadAtStand(token);
        expect((await rows()).map((r) => r.uploaderName)).toEqual([null, null]);
      });

      it('accepts a name of 60 characters and refuses 61 with 400 and details', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await uploadAtStand(token, { name: 'n'.repeat(60) });
        const res = await uploadAtStand(token, { name: 'n'.repeat(61), status: 400 });
        expect(detailPaths(res)).toEqual(['name']);
        expect(await rows()).toHaveLength(1);
        expect(await files()).toHaveLength(1);
      });

      it('answers 400 for another text field and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await request(app)
          .post(`${stand}/${token}`)
          .set('Cookie', `${COOKIE}=${await newDevice(token)}`)
          .field('name', 'Linus')
          .field('role', 'admin')
          .attach('photo', await png(), 'a.png')
          .expect(400);
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('answers 400 for a non-image and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await request(app)
          .post(`${stand}/${token}`)
          .set('Cookie', `${COOKIE}=${await newDevice(token)}`)
          .attach('photo', Buffer.from('not an image'), 'a.png')
          .expect(400);
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('answers 400 without a file and sets no cookie', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const res = await request(app)
          .post(`${stand}/${token}`)
          .set('Cookie', `${COOKIE}=${await newDevice(token)}`)
          .field('name', 'x')
          .expect(400);
        expect(res.headers['set-cookie']).toBeUndefined();
      });

      it('rejects invisible characters in the name with 400 and path name', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = await newDevice(token);
        for (const name of ['Li\u200Bnus', 'abc\u202Edef', 'a\u0000b', 'a\u0007b', '\u200B']) {
          const res = await uploadAtStand(token, { cookie: device, name, status: 400 });
          expect(detailPaths(res)).toEqual(['name']);
        }
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
        // ordinary names with accents, emoji and inner spaces stay fine
        await uploadAtStand(token, { cookie: device, name: 'Jürgen Åsa 日本' });
      });

      it('fits a tall photo inside the photo width as well', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const tall = await sharp({
          create: { width: 100, height: 800, channels: 3, background: 'blue' },
        })
          .png()
          .toBuffer();
        const res = await request(app)
          .post(`${link}/${guest.photoToken}`)
          .attach('photo', tall, 'a.png')
          .expect(201);
        const [photo] = res.body.upload.photos;
        expect(photo.height).toBeLessThanOrEqual(200);
        expect(photo.width).toBeLessThanOrEqual(200);
        expect(photo.height).toBe(200);
        expect(photo.width).toBe(25);
      });
    });

    describe('POST /stand/:token/device', () => {
      it('sets the device cookie with its flags and answers 204 without a body', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const res = await request(app).post(`${stand}/${token}/device`).expect(204);
        expect(res.text).toBe('');
        expect(res.headers['cache-control']).toContain('no-store');
        const header = (res.headers['set-cookie'] as unknown as string[])[0]!;
        expect(header).toMatch(new RegExp(`^${COOKIE}=[A-Za-z0-9_-]{43};`));
        expect(header).toContain('HttpOnly');
        expect(header).toContain(`Path=${apiPrefix}/stand`);
        expect(header).toMatch(/SameSite=Lax/i);
        expect(header).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
        expect(header).not.toContain('Secure');
      });

      it('gives different devices different ids', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        expect(await newDevice(token)).not.toBe(await newDevice(token));
      });

      it('sets no cookie when the device has one already', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = await newDevice(token);
        const res = await request(app)
          .post(`${stand}/${token}/device`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(204);
        expect(res.headers['set-cookie']).toBeUndefined();
      });

      it('works before the window opens and stores nothing', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await newDevice(token);
        expect(await rows()).toHaveLength(0);
      });

      it('answers 404 for unknown, renewed, off and malformed links', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const old = await turnOnStand(agent, event.id);
        const renewed = await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
        const answers = [
          await request(app).post(`${stand}/${old}/device`),
          await request(app).post(`${stand}/${unknownToken}/device`),
          await request(app).post(`${stand}/short/device`),
        ];
        await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
        answers.push(
          await request(app).post(`${stand}/${renewed.body.event.photoStand.token}/device`),
        );
        for (const answer of answers) {
          expect(answer.status).toBe(404);
          expect(answer.body).toEqual({ error: { message: 'Upload not found' } });
          expect(answer.headers['set-cookie']).toBeUndefined();
        }
      });

      it('keeps parallel uploads of one phone on one device after one device call', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = await newDevice(token);
        const image = await png();
        const results = await Promise.all(
          Array.from({ length: 3 }, () =>
            request(app)
              .post(`${stand}/${token}`)
              .set('Cookie', `${COOKIE}=${device}`)
              .attach('photo', image, 'a.png'),
          ),
        );
        expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
        for (const r of results) expect(r.headers['set-cookie']).toBeUndefined();
        expect(new Set((await rows()).map((r) => r.deviceId))).toEqual(new Set([device]));
      });

      it('lets a script without the cookie never upload', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const image = await png();
        const results = await Promise.all(
          Array.from({ length: 4 }, () =>
            request(app).post(`${stand}/${token}`).attach('photo', image, 'a.png'),
          ),
        );
        expect(results.map((r) => r.status)).toEqual([409, 409, 409, 409]);
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });
    });

    describe('the cap of the stand', () => {
      it('refuses stand uploads after 5 stand photos in the event, while photo links still work', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const guest = await addGuest(agent, event.id);
        // three devices of 2 photos: the 6th stand photo is over the cap of 5
        const devices = [await newDevice(token), await newDevice(token), await newDevice(token)];
        for (const [i, device] of devices.entries()) {
          for (let n = 0; n < 2; n++) {
            if (i * 2 + n < config.photos.maxPerStand) {
              await uploadAtStand(token, { cookie: device });
            } else {
              const res = await uploadAtStand(token, { cookie: device, status: 409 });
              expect(res.body.error.message).toEqual(expect.any(String));
            }
          }
        }
        expect(await rows()).toHaveLength(config.photos.maxPerStand);
        // the event limit of 10 is not reached, so guests can use the rest
        for (let i = 0; i < 3; i++) await uploadAsGuest(guest.photoToken);
        expect(await rows()).toHaveLength(config.photos.maxPerStand + 3);
        // a deleted stand photo frees a place
        const own = (
          await request(app).get(`${stand}/${token}`).set('Cookie', `${COOKIE}=${devices[0]}`)
        ).body.upload.photos[0].id;
        await request(app)
          .delete(`${stand}/${token}/${own}`)
          .set('Cookie', `${COOKIE}=${devices[0]}`)
          .expect(200);
        await uploadAtStand(token, { cookie: devices[2] });
      });

      it('counts only photos of the stand, not those of photo links', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const guest = await addGuest(agent, event.id);
        for (let i = 0; i < 3; i++) await uploadAsGuest(guest.photoToken);
        const other = await addGuest(agent, event.id, 'Alan');
        for (let i = 0; i < 2; i++) await uploadAsGuest(other.photoToken);
        // 5 link photos, the event has 5 left: stand photos up to the stand cap still fit
        for (let i = 0; i < 5; i++) await uploadAtStand(token, { cookie: undefined });
        await uploadAtStand(token, { status: 409 });
      });

      it('lets parallel stand uploads at the cap store at most the cap', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const devices = await Promise.all(Array.from({ length: 4 }, () => newDevice(token)));
        const image = await png();
        const results = await Promise.all(
          devices.flatMap((device) =>
            [0, 1].map(() =>
              request(app)
                .post(`${stand}/${token}`)
                .set('Cookie', `${COOKIE}=${device}`)
                .attach('photo', image, 'a.png'),
            ),
          ),
        );
        expect(results.filter((r) => r.status === 201)).toHaveLength(config.photos.maxPerStand);
        expect(results.filter((r) => r.status === 409)).toHaveLength(8 - config.photos.maxPerStand);
        const stored = await rows();
        expect(stored).toHaveLength(config.photos.maxPerStand);
        expect((await files()).sort()).toEqual(stored.map((r) => r.filename).sort());
      });
    });

    describe('devices', () => {
      it('limits per device: the 4th photo of one device is 409, another device still can', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = deviceCookie(await uploadAtStand(token));
        await uploadAtStand(token, { cookie: device });
        await uploadAtStand(token, { cookie: device });
        const refused = await uploadAtStand(token, { cookie: device, status: 409 });
        expect(refused.body.error.message).toEqual(expect.any(String));
        expect(await rows()).toHaveLength(3);
        expect(await files()).toHaveLength(3);

        const other = await uploadAtStand(token);
        expect(deviceCookie(other)).not.toBe(device);
        expect(await rows()).toHaveLength(4);
      });

      it('gives every device its own id, so one phone never sees the photos of another', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const first = await uploadAtStand(token);
        const second = await uploadAtStand(token);
        expect(deviceCookie(first)).not.toBe(deviceCookie(second));
        const page = await request(app).get(`${stand}/${token}`).expect(200);
        expect(page.body.upload).toMatchObject({ photos: [], left: 3 });
        await request(app).get(`${stand}/${token}/${first.body.upload.photos[0].id}`).expect(404);
        await request(app)
          .delete(`${stand}/${token}/${first.body.upload.photos[0].id}`)
          .expect(404);
      });

      it('treats a malformed cookie as no device: nothing seen, uploads 409, the device call issues a new id', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const real = await newDevice(token);
        await uploadAtStand(token, { cookie: real });
        for (const bad of ['short', real + 'x', real.slice(0, 42), `${real.slice(0, 42)}!`]) {
          const page = await request(app)
            .get(`${stand}/${token}`)
            .set('Cookie', `${COOKIE}=${bad}`)
            .expect(200);
          expect(page.body.upload).toMatchObject({ photos: [], left: 3 });
          await uploadAtStand(token, { cookie: bad, status: 409 });
          const issued = await request(app)
            .post(`${stand}/${token}/device`)
            .set('Cookie', `${COOKIE}=${bad}`)
            .expect(204);
          expect(setCookieOf(issued)).toMatch(/^[A-Za-z0-9_-]{43}$/);
          expect(setCookieOf(issued)).not.toBe(bad);
        }
        expect(await rows()).toHaveLength(1);
      });

      it('does not let a device see or delete the photos of another device', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const a = await uploadAtStand(token);
        const deviceA = deviceCookie(a);
        const photoA = a.body.upload.photos[0].id;
        const deviceB = deviceCookie(await uploadAtStand(token));

        const pageB = await request(app)
          .get(`${stand}/${token}`)
          .set('Cookie', `${COOKIE}=${deviceB}`)
          .expect(200);
        expect(pageB.body.upload.photos.map((p: { id: string }) => p.id)).not.toContain(photoA);
        await request(app)
          .get(`${stand}/${token}/${photoA}`)
          .set('Cookie', `${COOKIE}=${deviceB}`)
          .expect(404);
        await request(app)
          .delete(`${stand}/${token}/${photoA}`)
          .set('Cookie', `${COOKIE}=${deviceB}`)
          .expect(404);
        expect(await rows()).toHaveLength(2);
        await request(app)
          .get(`${stand}/${token}/${photoA}`)
          .set('Cookie', `${COOKIE}=${deviceA}`)
          .expect(200);
      });

      it('serves and deletes an own photo of the device', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const up = await uploadAtStand(token);
        const device = deviceCookie(up);
        const photoId = up.body.upload.photos[0].id;

        const file = await binary(
          request(app)
            .get(`${stand}/${token}/${photoId}`)
            .set('Cookie', `${COOKIE}=${device}`)
            .expect(200),
        );
        expect(file.headers['content-type']).toBe('image/webp');
        expect(file.headers['cache-control']).toBe('private, no-cache');

        const del = await request(app)
          .delete(`${stand}/${token}/${photoId}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(200);
        expect(del.body.upload).toMatchObject({ photos: [], left: 3 });
        expect(del.headers['cache-control']).toContain('no-store');
        expect(await rows()).toHaveLength(0);
        expect(await files()).toEqual([]);
      });

      it('keeps the stand and the photo links apart: a device id on a guest photo is no match', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const token = await turnOnStand(agent, event.id);
        const own = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        const device = deviceCookie(await uploadAtStand(token));
        await request(app)
          .get(`${stand}/${token}/${own}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(404);
      });

      it('does not let a stand of event B reach the photos of event A', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const tokenA = await turnOnStand(agent, eventA.id);
        const tokenB = await turnOnStand(agent, eventB.id);
        const up = await uploadAtStand(tokenA);
        const device = deviceCookie(up);
        const photoId = up.body.upload.photos[0].id;
        // the same device cookie at another stand owns nothing there
        const page = await request(app)
          .get(`${stand}/${tokenB}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(200);
        expect(page.body.upload.photos).toEqual([]);
        await request(app)
          .get(`${stand}/${tokenB}/${photoId}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(404);
        await request(app)
          .delete(`${stand}/${tokenB}/${photoId}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(404);
        expect(await rows()).toHaveLength(1);
      });

      it('lets parallel uploads of one device store at most the device limit', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const device = deviceCookie(await uploadAtStand(token));
        const image = await png();
        const results = await Promise.all(
          Array.from({ length: 5 }, () =>
            request(app)
              .post(`${stand}/${token}`)
              .set('Cookie', `${COOKIE}=${device}`)
              .attach('photo', image, 'a.png'),
          ),
        );
        // one place was taken already: 2 are left
        expect(results.map((r) => r.status).sort()).toEqual([201, 201, 409, 409, 409]);
        const stored = await rows();
        expect(stored).toHaveLength(3);
        expect((await files()).sort()).toEqual(stored.map((r) => r.filename).sort());
      });

      it('refuses at the limit of the event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await db.insert(eventPhotos).values(
          Array.from({ length: config.photos.maxPerEvent }, (_, i) => ({
            eventId: event.id,
            source: 'stand' as const,
            deviceId: `device-${i}`,
            filename: `missing-${i}.webp`,
            width: 10,
            height: 10,
          })),
        );
        await uploadAtStand(token, { status: 409 });
        expect(await files()).toEqual([]);
      });
    });

    describe('the upload window', () => {
      it('is closed before the start and 7 days after the end, open between', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await createEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await uploadAtStand(token, { status: 409 });
        await setTimes(event.id, -8 * day, -7 * day - 2 * minute);
        const closed = await uploadAtStand(token, { status: 409 });
        expect(closed.headers['set-cookie']).toBeUndefined();
        await setTimes(event.id, -8 * day, -7 * day + 2 * minute);
        await uploadAtStand(token);
        expect(await rows()).toHaveLength(1);
      });
    });

    describe('turned off or renewed', () => {
      it('answers the same 404 on every route for unknown, renewed, off and malformed links', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const oldToken = await turnOnStand(agent, event.id);
        const up = await uploadAtStand(oldToken);
        const device = deviceCookie(up);
        const photoId = up.body.upload.photos[0].id;
        const renewed = await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
        const newToken = renewed.body.event.photoStand.token as string;
        expect(newToken).not.toBe(oldToken);

        const image = await png();
        const check = async (token: string) => [
          await request(app).get(`${stand}/${token}`).set('Cookie', `${COOKIE}=${device}`),
          await request(app)
            .post(`${stand}/${token}`)
            .set('Cookie', `${COOKIE}=${device}`)
            .attach('photo', image, 'a.png'),
          await request(app)
            .get(`${stand}/${token}/${photoId}`)
            .set('Cookie', `${COOKIE}=${device}`),
          await request(app)
            .delete(`${stand}/${token}/${photoId}`)
            .set('Cookie', `${COOKIE}=${device}`),
        ];
        const answers = [
          ...(await check(oldToken)),
          ...(await check(unknownToken)),
          ...(await check('short')),
        ];
        await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
        answers.push(...(await check(newToken)));
        for (const answer of answers) {
          expect(answer.status).toBe(404);
          expect(answer.body).toEqual({ error: { message: 'Upload not found' } });
        }
        // the photo stays for the hosts
        expect(await rows()).toHaveLength(1);
        expect(await files()).toHaveLength(1);
      });

      it('lets the new link see the photos of the same device', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const oldToken = await turnOnStand(agent, event.id);
        const device = deviceCookie(await uploadAtStand(oldToken));
        const renewed = await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
        const page = await request(app)
          .get(`${stand}/${renewed.body.event.photoStand.token}`)
          .set('Cookie', `${COOKIE}=${device}`)
          .expect(200);
        expect(page.body.upload.photos).toHaveLength(1);
      });
    });
  });

  describe('host settings of the photo stand', () => {
    it('answer 401 without a session', async () => {
      await request(app).put(`${base}/${unknownId}/photo-stand`).expect(401);
      await request(app).delete(`${base}/${unknownId}/photo-stand`).expect(401);
      await request(app).post(`${base}/${unknownId}/photo-stand/token`).expect(401);
      await request(app).post(`${base}/${unknownId}/guests/${unknownId}/photo-token`).expect(401);
    });

    it('answer 404 for a non-member and an unknown event', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const event = await createEvent(ada);
      await turnOnStand(ada, event.id);
      await eve.put(`${base}/${event.id}/photo-stand`).expect(404);
      await eve.delete(`${base}/${event.id}/photo-stand`).expect(404);
      await eve.post(`${base}/${event.id}/photo-stand/token`).expect(404);
      await ada.put(`${base}/${unknownId}/photo-stand`).expect(404);
      await ada.put(`${base}/not-a-uuid/photo-stand`).expect(400);
      // eve changed nothing
      const read = await ada.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.photoStand).not.toBeNull();
    });

    it('turns it on with a token, keeps the token on a second PUT, and shows it in the event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      expect((await agent.get(`${base}/${event.id}`)).body.event.photoStand).toBeNull();

      const on = await agent.put(`${base}/${event.id}/photo-stand`).expect(200);
      expect(on.body.event.photoStand).toEqual({
        token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      });
      expect(on.headers['cache-control']).toContain('no-store');
      const again = await agent.put(`${base}/${event.id}/photo-stand`).expect(200);
      expect(again.body.event.photoStand).toEqual(on.body.event.photoStand);
      const list = await agent.get(base).expect(200);
      expect(list.body.events[0].photoStand).toEqual(on.body.event.photoStand);
    });

    it('turns it off, also when it is off already', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await turnOnStand(agent, event.id);
      const off = await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
      expect(off.body.event.photoStand).toBeNull();
      await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
    });

    it('renews the token, and answers 404 while it is off', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await agent.post(`${base}/${event.id}/photo-stand/token`).expect(404);
      const first = await turnOnStand(agent, event.id);
      const renewed = await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
      expect(renewed.body.event.photoStand.token).not.toBe(first);
      expect(renewed.headers['cache-control']).toContain('no-store');
      await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
      await agent.post(`${base}/${event.id}/photo-stand/token`).expect(404);
    });

    it('turning it on again after off gives a new token', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const first = await turnOnStand(agent, event.id);
      await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
      expect(await turnOnStand(agent, event.id)).not.toBe(first);
    });

    it('works for an editor', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const grace = await signedUpAgent('grace@example.com');
      const event = await createEvent(ada);
      await addEditor(event.id, grace);
      await grace.put(`${base}/${event.id}/photo-stand`).expect(200);
      await grace.post(`${base}/${event.id}/photo-stand/token`).expect(200);
      await grace.delete(`${base}/${event.id}/photo-stand`).expect(200);
    });

    it('renews after the event while the upload window is open, 409 once it is closed', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const first = await turnOnStand(agent, event.id);
      await setTimes(event.id, -3 * day, -2 * day);
      const renewed = await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
      expect(renewed.body.event.photoStand.token).not.toBe(first);
      await request(app).get(`${stand}/${first}`).expect(404);
      await request(app).get(`${stand}/${renewed.body.event.photoStand.token}`).expect(200);

      // 2 minutes inside the window, then 2 minutes after it
      await setTimes(event.id, -8 * day, -7 * day + 2 * minute);
      await agent.post(`${base}/${event.id}/photo-stand/token`).expect(200);
      await setTimes(event.id, -8 * day, -7 * day - 2 * minute);
      await agent.post(`${base}/${event.id}/photo-stand/token`).expect(409);
    });

    it('answers 409 to turning it on after the event, but lets it be turned off', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await turnOnStand(agent, event.id);
      await setTimes(event.id, -3 * day, -2 * day);
      await agent.put(`${base}/${event.id}/photo-stand`).expect(409); // also while it is on
      await agent.delete(`${base}/${event.id}/photo-stand`).expect(200);
      // off, and after the event: on is 409
      await agent.put(`${base}/${event.id}/photo-stand`).expect(409);
      await agent.post(`${base}/${event.id}/photo-stand/token`).expect(404);
    });
  });

  describe('POST /events/:id/guests/:guestId/photo-token', () => {
    it('renews the photo link, keeps the answer link and the photos, and ends the old link', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await liveEvent(agent);
      const guest = await addGuest(agent, event.id);
      await uploadAsGuest(guest.photoToken);

      const res = await agent
        .post(`${base}/${event.id}/guests/${guest.id}/photo-token`)
        .expect(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.body.guest).toMatchObject({ id: guest.id, token: guest.token });
      expect(res.body.guest.photoToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(res.body.guest.photoToken).not.toBe(guest.photoToken);

      await request(app).get(`${link}/${guest.photoToken}`).expect(404);
      await request(app).get(`${apiPrefix}/rsvp/${guest.token}`).expect(200);
      const page = await request(app).get(`${link}/${res.body.guest.photoToken}`).expect(200);
      expect(page.body.upload.photos).toHaveLength(1);
    });

    it('answers 404 for another event, an unknown guest and a non-member', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const eventA = await createEvent(ada);
      const eventB = await createEvent(ada);
      const guest = await addGuest(ada, eventA.id);
      await ada.post(`${base}/${eventB.id}/guests/${guest.id}/photo-token`).expect(404);
      await ada.post(`${base}/${eventA.id}/guests/${unknownId}/photo-token`).expect(404);
      await eve.post(`${base}/${eventA.id}/guests/${guest.id}/photo-token`).expect(404);
      const [row] = await db.select().from(guests).where(eq(guests.id, guest.id));
      expect(row!.photoToken).toBe(guest.photoToken);
    });

    it('works for an editor', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const grace = await signedUpAgent('grace@example.com');
      const event = await createEvent(ada);
      const guest = await addGuest(ada, event.id);
      await addEditor(event.id, grace);
      await grace.post(`${base}/${event.id}/guests/${guest.id}/photo-token`).expect(200);
    });

    it('works after the event while the upload window is open, 409 once it is closed', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await liveEvent(agent);
      const guest = await addGuest(agent, event.id);
      await setTimes(event.id, -3 * day, -2 * day);
      const res = await agent
        .post(`${base}/${event.id}/guests/${guest.id}/photo-token`)
        .expect(200);
      await request(app).get(`${link}/${guest.photoToken}`).expect(404);
      await request(app).get(`${link}/${res.body.guest.photoToken}`).expect(200);

      await setTimes(event.id, -8 * day, -7 * day + 2 * minute);
      await agent.post(`${base}/${event.id}/guests/${guest.id}/photo-token`).expect(200);
      await setTimes(event.id, -8 * day, -7 * day - 2 * minute);
      await agent.post(`${base}/${event.id}/guests/${guest.id}/photo-token`).expect(409);
      const [row] = await db.select().from(guests).where(eq(guests.id, guest.id));
      expect(row!.photoToken).not.toBe(guest.photoToken);
    });

    it('gives every guest a different photo token', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const a = await addGuest(agent, event.id, 'A');
      const b = await addGuest(agent, event.id, 'B');
      expect(new Set([a.photoToken, b.photoToken, a.token, b.token]).size).toBe(4);
    });
  });

  describe('removing a guest', () => {
    it('keeps their photos for the hosts, with the name and no guest id, and ends the link', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await liveEvent(agent);
      const guest = await addGuest(agent, event.id, 'Grace');
      await uploadAsGuest(guest.photoToken);
      await agent.delete(`${base}/${event.id}/guests/${guest.id}`).expect(204);

      await request(app).get(`${link}/${guest.photoToken}`).expect(404);
      const [stored] = await rows();
      expect(stored).toMatchObject({ guestId: null, uploaderName: 'Grace' });
      expect(await files()).toEqual([stored!.filename]);
      const list = await agent.get(`${base}/${event.id}/photos`).expect(200);
      expect(list.body.photos).toHaveLength(1);
      expect(list.body.photos[0]).toMatchObject({ source: 'guest', uploaderName: 'Grace' });
    });
  });

  describe('host routes /events/:id/photos', () => {
    it('answer 401 without a session', async () => {
      const url = `${base}/${unknownId}/photos`;
      await request(app).get(url).expect(401);
      await request(app).get(`${url}/archive`).expect(401);
      await request(app).get(`${url}/${unknownId}`).expect(401);
      await request(app).patch(`${url}/${unknownId}`).send({ hidden: true }).expect(401);
      await request(app).delete(`${url}/${unknownId}`).expect(401);
    });

    it('answer 404 for a non-member on every route and change nothing', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const eve = await signedUpAgent('eve@example.com');
      const event = await liveEvent(ada);
      const guest = await addGuest(ada, event.id);
      const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
      const url = `${base}/${event.id}/photos`;
      await eve.get(url).expect(404);
      await eve.get(`${url}/archive`).expect(404);
      await eve.get(`${url}/${photoId}`).expect(404);
      await eve.patch(`${url}/${photoId}`).send({ hidden: true }).expect(404);
      await eve.delete(`${url}/${photoId}`).expect(404);
      const [stored] = await rows();
      expect(stored!.hidden).toBe(false);
      expect(await files()).toHaveLength(1);
    });

    describe('GET /events/:id/photos', () => {
      it('lists an empty event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const res = await agent.get(`${base}/${event.id}/photos`).expect(200);
        expect(res.body).toEqual({ photos: [] });
        expect(res.headers['cache-control']).toContain('no-store');
      });

      it('lists newest first with source, uploader name, hidden and the full shape', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace');
        const token = await turnOnStand(agent, event.id);
        const first = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        const second = (await uploadAtStand(token, { name: 'Linus' })).body.upload.photos[0].id;
        const third = (await uploadAtStand(token)).body.upload.photos[0].id;

        const res = await agent.get(`${base}/${event.id}/photos`).expect(200);
        expect(res.body.photos.map((p: { id: string }) => p.id)).toEqual([third, second, first]);
        expect(res.body.photos[2]).toEqual({
          id: first,
          source: 'guest',
          uploaderName: 'Grace',
          width: 200,
          height: 100,
          hidden: false,
          createdAt: expect.any(String),
        });
        expect(res.body.photos[1]).toMatchObject({ source: 'stand', uploaderName: 'Linus' });
        expect(res.body.photos[0]).toMatchObject({ source: 'stand', uploaderName: null });
        // the device and the file name are internal
        for (const photo of res.body.photos) {
          expect(Object.keys(photo).sort()).toEqual(
            ['createdAt', 'hidden', 'height', 'id', 'source', 'uploaderName', 'width'].sort(),
          );
        }
      });

      it('lists only the photos of this event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const inA = await addGuest(agent, eventA.id);
        const inB = await addGuest(agent, eventB.id);
        await uploadAsGuest(inA.photoToken);
        await uploadAsGuest(inB.photoToken);
        const res = await agent.get(`${base}/${eventA.id}/photos`).expect(200);
        expect(res.body.photos).toHaveLength(1);
      });

      it('works for an editor and after the event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const event = await liveEvent(ada);
        const guest = await addGuest(ada, event.id);
        await uploadAsGuest(guest.photoToken);
        await addEditor(event.id, grace);
        await setTimes(event.id, -30 * day, -20 * day);
        expect(
          (await grace.get(`${base}/${event.id}/photos`).expect(200)).body.photos,
        ).toHaveLength(1);
      });

      it('answers 400 for a malformed event id and 404 for an unknown one', async () => {
        const agent = await signedUpAgent('ada@example.com');
        await agent.get(`${base}/nope/photos`).expect(400);
        await agent.get(`${base}/${unknownId}/photos`).expect(404);
      });
    });

    describe('GET /events/:id/photos/:photoId', () => {
      it('serves the WebP file with a private, revalidated cache, also for hidden photos', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await agent.patch(`${base}/${event.id}/photos/${photoId}`).send({ hidden: true });
        const res = await binary(agent.get(`${base}/${event.id}/photos/${photoId}`).expect(200));
        expect(res.headers['content-type']).toBe('image/webp');
        expect(res.headers['cache-control']).toBe('private, no-cache');
        expect(await sharp(res.body as Buffer).metadata()).toMatchObject({ format: 'webp' });
      });

      it('answers 404 for an unknown photo and for a photo of another event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const inB = await addGuest(agent, eventB.id);
        const photoOfB = (await uploadAsGuest(inB.photoToken)).body.upload.photos[0].id;
        await agent.get(`${base}/${eventA.id}/photos/${unknownId}`).expect(404);
        await agent.get(`${base}/${eventA.id}/photos/${photoOfB}`).expect(404);
        await agent.get(`${base}/${eventA.id}/photos/nope`).expect(400);
      });
    });

    describe('PATCH /events/:id/photos/:photoId', () => {
      it('hides and shows a photo, answering the photo', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace');
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        const url = `${base}/${event.id}/photos/${photoId}`;

        const hidden = await agent.patch(url).send({ hidden: true }).expect(200);
        expect(hidden.body).toEqual({
          photo: {
            id: photoId,
            source: 'guest',
            uploaderName: 'Grace',
            width: 200,
            height: 100,
            hidden: true,
            createdAt: expect.any(String),
          },
        });
        expect(hidden.headers['cache-control']).toContain('no-store');
        expect((await rows())[0]!.hidden).toBe(true);
        const shown = await agent.patch(url).send({ hidden: false }).expect(200);
        expect(shown.body.photo.hidden).toBe(false);
      });

      it('still shows a hidden photo to its guest', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await agent.patch(`${base}/${event.id}/photos/${photoId}`).send({ hidden: true });
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload.photos).toHaveLength(1);
      });

      it('answers 400 with details for a bad body', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        const url = `${base}/${event.id}/photos/${photoId}`;
        expect(detailPaths(await agent.patch(url).send({}).expect(400))).toEqual(['hidden']);
        expect(detailPaths(await agent.patch(url).send({ hidden: 'yes' }).expect(400))).toEqual([
          'hidden',
        ]);
        expect(detailPaths(await agent.patch(url).send({ hidden: 1 }).expect(400))).toEqual([
          'hidden',
        ]);
        await agent.patch(`${base}/${event.id}/photos/nope`).send({ hidden: true }).expect(400);
        expect((await rows())[0]!.hidden).toBe(false);
      });

      it('answers 404 for an unknown photo and for a photo of another event', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const inB = await addGuest(agent, eventB.id);
        const photoOfB = (await uploadAsGuest(inB.photoToken)).body.upload.photos[0].id;
        await agent
          .patch(`${base}/${eventA.id}/photos/${unknownId}`)
          .send({ hidden: true })
          .expect(404);
        await agent
          .patch(`${base}/${eventA.id}/photos/${photoOfB}`)
          .send({ hidden: true })
          .expect(404);
        expect((await rows())[0]!.hidden).toBe(false);
      });

      it('works for an editor and after the event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const event = await liveEvent(ada);
        const guest = await addGuest(ada, event.id);
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await addEditor(event.id, grace);
        await setTimes(event.id, -30 * day, -20 * day);
        await grace
          .patch(`${base}/${event.id}/photos/${photoId}`)
          .send({ hidden: true })
          .expect(200);
      });
    });

    describe('DELETE /events/:id/photos/:photoId', () => {
      it('deletes the photo and its file with 204', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const photoId = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await uploadAsGuest(guest.photoToken);
        await agent.delete(`${base}/${event.id}/photos/${photoId}`).expect(204);
        expect(await rows()).toHaveLength(1);
        expect(await files()).toHaveLength(1);
        await agent.delete(`${base}/${event.id}/photos/${photoId}`).expect(404);
        // the guest has the place free again
        const page = await request(app).get(`${link}/${guest.photoToken}`).expect(200);
        expect(page.body.upload.left).toBe(2);
      });

      it('answers 404 for a photo of another event and keeps it', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const eventA = await liveEvent(agent);
        const eventB = await liveEvent(agent);
        const inB = await addGuest(agent, eventB.id);
        const photoOfB = (await uploadAsGuest(inB.photoToken)).body.upload.photos[0].id;
        await agent.delete(`${base}/${eventA.id}/photos/${photoOfB}`).expect(404);
        await agent.delete(`${base}/${eventA.id}/photos/${unknownId}`).expect(404);
        expect(await rows()).toHaveLength(1);
        expect(await files()).toHaveLength(1);
      });

      it('works for an editor and after the event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const event = await liveEvent(ada);
        const guest = await addGuest(ada, event.id);
        const first = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await uploadAsGuest(guest.photoToken);
        await addEditor(event.id, grace);
        await grace.delete(`${base}/${event.id}/photos/${first}`).expect(204);
        await setTimes(event.id, -30 * day, -20 * day);
        const rest = (await ada.get(`${base}/${event.id}/photos`)).body.photos[0].id;
        await grace.delete(`${base}/${event.id}/photos/${rest}`).expect(204);
        expect(await files()).toEqual([]);
      });
    });

    describe('GET /events/:id/photos/archive', () => {
      it('is a valid empty ZIP for an event without photos', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        expect(res.headers['content-type']).toContain('application/zip');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('photos.zip');
        expect(parseZip(res.body as Buffer)).toEqual([]);
      });

      it('holds the visible photos named by uploader and number, with the real bytes', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const grace = await addGuest(agent, event.id, 'Grace Hopper');
        const juergen = await addGuest(agent, event.id, 'Jürgen');
        const token = await turnOnStand(agent, event.id);
        await uploadAsGuest(grace.photoToken);
        await uploadAsGuest(grace.photoToken);
        await uploadAsGuest(juergen.photoToken);
        await uploadAtStand(token, { name: 'Linus' });
        await uploadAtStand(token);

        const list = (await agent.get(`${base}/${event.id}/photos`).expect(200)).body.photos;
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        const entries = parseZip(res.body as Buffer);

        expect(entries.map((e) => e.name).sort()).toEqual(
          [
            'Grace-Hopper-1.webp',
            'Grace-Hopper-2.webp',
            'Jürgen-1.webp',
            'Linus-1.webp',
            'photo-1.webp',
          ].sort(),
        );
        for (const entry of entries) {
          expect(entry.method).toBe(0);
          expect(entry.flags & 0x0800).toBe(0x0800);
          expect(entry.size).toBe(entry.data.length);
          expect(await sharp(entry.data).metadata()).toMatchObject({ format: 'webp' });
        }
        // each file is the one the host route serves: oldest gets number 1
        const oldestFirst = [...list].reverse() as { id: string; uploaderName: string | null }[];
        const graceIds = oldestFirst.filter((p) => p.uploaderName === 'Grace Hopper');
        for (const [i, photo] of graceIds.entries()) {
          const served = await binary(
            agent.get(`${base}/${event.id}/photos/${photo.id}`).expect(200),
          );
          const entry = entries.find((e) => e.name === `Grace-Hopper-${i + 1}.webp`);
          expect(entry?.data.equals(served.body as Buffer)).toBe(true);
        }
      });

      it('leaves out hidden photos and puts them back when shown again', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace');
        await uploadAsGuest(guest.photoToken);
        const second = (await uploadAsGuest(guest.photoToken)).body.upload.photos[1].id;
        await agent.patch(`${base}/${event.id}/photos/${second}`).send({ hidden: true });

        const url = `${base}/${event.id}/photos/archive`;
        const hidden = parseZip((await binary(agent.get(url).expect(200))).body as Buffer);
        expect(hidden.map((e) => e.name)).toEqual(['Grace-1.webp']);

        await agent.patch(`${base}/${event.id}/photos/${second}`).send({ hidden: false });
        const shown = parseZip((await binary(agent.get(url).expect(200))).body as Buffer);
        expect(shown.map((e) => e.name)).toEqual(['Grace-1.webp', 'Grace-2.webp']);
      });

      it('leaves out a photo whose file is gone and stays a valid ZIP', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id, 'Grace');
        for (let i = 0; i < 3; i++) await uploadAsGuest(guest.photoToken);
        const [victim] = await rows();
        await rm(path.join(config.uploads.dir, victim!.filename));
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        const entries = parseZip(res.body as Buffer);
        expect(entries).toHaveLength(2);
        for (const entry of entries) {
          expect(await sharp(entry.data).metadata()).toMatchObject({ format: 'webp' });
        }
        // the row is still listed for the hosts
        expect((await agent.get(`${base}/${event.id}/photos`)).body.photos).toHaveLength(3);
      });

      it('is an empty ZIP when all photos are hidden', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const guest = await addGuest(agent, event.id);
        const id = (await uploadAsGuest(guest.photoToken)).body.upload.photos[0].id;
        await agent.patch(`${base}/${event.id}/photos/${id}`).send({ hidden: true });
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        expect(parseZip(res.body as Buffer)).toEqual([]);
      });

      it('makes a safe entry name from an uploader with odd characters', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        await uploadAtStand(token, { name: '../../etc/passwd' });
        await uploadAtStand(token, { name: '***' });
        await uploadAtStand(token, { name: 'a'.repeat(60) });
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        const names = parseZip(res.body as Buffer).map((e) => e.name);
        for (const name of names) {
          expect(name).toMatch(/^[\p{L}\p{N}-]+-\d+\.webp$/u);
          expect(name).not.toContain('/');
          expect(name).not.toContain('..');
        }
        expect(names).toContain('etc-passwd-1.webp');
        expect(names).toContain('photo-1.webp');
      });

      it('numbers two uploaders with the same name together', async () => {
        const agent = await signedUpAgent('ada@example.com');
        const event = await liveEvent(agent);
        const token = await turnOnStand(agent, event.id);
        const guest = await addGuest(agent, event.id, 'Linus');
        await uploadAtStand(token, { name: 'Linus' });
        await uploadAsGuest(guest.photoToken);
        const res = await binary(agent.get(`${base}/${event.id}/photos/archive`).expect(200));
        expect(
          parseZip(res.body as Buffer)
            .map((e) => e.name)
            .sort(),
        ).toEqual(['Linus-1.webp', 'Linus-2.webp']);
      });

      it('works for an editor and after the event, and holds only this event', async () => {
        const ada = await signedUpAgent('ada@example.com');
        const grace = await signedUpAgent('grace@example.com');
        const eventA = await liveEvent(ada);
        const eventB = await liveEvent(ada);
        const inA = await addGuest(ada, eventA.id);
        const inB = await addGuest(ada, eventB.id);
        await uploadAsGuest(inA.photoToken);
        await uploadAsGuest(inB.photoToken);
        await addEditor(eventA.id, grace);
        await setTimes(eventA.id, -30 * day, -20 * day);
        const res = await binary(grace.get(`${base}/${eventA.id}/photos/archive`).expect(200));
        expect(parseZip(res.body as Buffer)).toHaveLength(1);
      });
    });
  });

  describe('deleting', () => {
    it('an event removes the photo files and the rows', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await liveEvent(agent);
      const other = await liveEvent(agent);
      const guest = await addGuest(agent, event.id);
      const keeper = await addGuest(agent, other.id);
      const token = await turnOnStand(agent, event.id);
      await uploadAsGuest(guest.photoToken);
      await uploadAsGuest(guest.photoToken);
      await uploadAtStand(token);
      await uploadAsGuest(keeper.photoToken);
      expect(await files()).toHaveLength(4);

      await agent.delete(`${base}/${event.id}`).expect(204);
      expect(await rows()).toHaveLength(1);
      expect(await files()).toHaveLength(1);
      await request(app).get(`${link}/${guest.photoToken}`).expect(404);
      await request(app).get(`${stand}/${token}`).expect(404);
    });

    it('an owner removes the photo files of their events, not those of events they do not own', async () => {
      const admin = await adminAgent();
      const ada = await signedUpAgent('ada@example.com');
      const grace = await signedUpAgent('grace@example.com');
      const owned = await liveEvent(ada);
      const shared = await liveEvent(grace);
      await db
        .insert(eventMembers)
        .values({ eventId: shared.id, userId: await userId(ada), role: 'editor' });
      const inOwned = await addGuest(ada, owned.id);
      const inShared = await addGuest(grace, shared.id);
      await uploadAsGuest(inOwned.photoToken);
      await uploadAsGuest(inOwned.photoToken);
      await uploadAsGuest(inShared.photoToken);
      expect(await files()).toHaveLength(3);

      await admin.delete(`${apiPrefix}/admin/users/${await userId(ada)}`).expect(204);
      expect(await rows()).toHaveLength(1);
      expect(await files()).toHaveLength(1);
      expect((await rows())[0]!.eventId).toBe(shared.id);
    });
  });
});
