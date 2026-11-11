import { db } from '@server/core/db/db';
import { eq } from 'drizzle-orm';
import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { apiPrefix } from '../../shared/api.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { eventImages, eventMembers, events } from './events.table.js';

type Agent = Awaited<ReturnType<typeof signedUpAgent>>;

const base = `${apiPrefix}/events`;
const day = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();

const upcoming = (extra: Record<string, unknown> = {}) => ({
  title: 'Summer party',
  startsAt: inDays(10),
  timeZone: 'Europe/Berlin',
  ...extra,
});
// no end, so the event ended at the end of its start day
const over = (extra: Record<string, unknown> = {}) => upcoming({ startsAt: inDays(-5), ...extra });

function png(width = 400, height = 200) {
  return sharp({ create: { width, height, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
}

const sample = await png();

/** A supertest request, so callers can chain `.expect()`. */
function uploadFiles(agent: Agent, id: string, count: number) {
  const file = sample;
  let req = agent.post(`${base}/${id}/images`);
  for (let i = 0; i < count; i++) req = req.attach('images', file, `${i}.png`);
  return req;
}

async function createEvent(agent: Agent, extra: Record<string, unknown> = {}) {
  const res = await agent.post(base).send(upcoming(extra)).expect(201);
  return res.body.event as { id: string };
}

async function userId(agent: Agent) {
  return (await agent.get(`${apiPrefix}/auth/me`).expect(200)).body.user.id as string;
}

/** Editors cannot be invited yet, so the membership is written directly. */
async function addEditor(eventId: string, editor: Agent) {
  await db.insert(eventMembers).values({ eventId, userId: await userId(editor), role: 'editor' });
}

/** Makes an event past without going through the API, which refuses to change past events. */
async function makePast(eventId: string) {
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - 5 * day), endsAt: null })
    .where(eq(events.id, eventId));
}

const uploadedFiles = () => readdir(config.uploads.dir);

function detailPaths(res: request.Response): string[] {
  return res.body.error.details.map((detail: { path: string }) => detail.path);
}

describe('events', () => {
  describe('without a session', () => {
    it('answers 401 on every route', async () => {
      const id = '00000000-0000-4000-8000-000000000000';
      await request(app).get(base).expect(401);
      await request(app).post(base).send(upcoming()).expect(401);
      await request(app).get(`${base}/${id}`).expect(401);
      await request(app).patch(`${base}/${id}`).send({ title: 'x' }).expect(401);
      await request(app).delete(`${base}/${id}`).expect(401);
      await request(app).post(`${base}/${id}/images`).expect(401);
      await request(app)
        .put(`${base}/${id}/images/order`)
        .send({ ids: [id] })
        .expect(401);
      await request(app).get(`${base}/${id}/images/${id}`).expect(401);
      await request(app).delete(`${base}/${id}/images/${id}`).expect(401);
    });
  });

  describe('POST /events', () => {
    it('creates an event with defaults and the caller as owner', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const startsAt = inDays(10);
      const res = await agent
        .post(base)
        .send({ title: ' Summer party ', startsAt, timeZone: 'Europe/Berlin' })
        .expect(201);

      expect(res.body).toEqual({
        event: {
          id: expect.any(String),
          title: 'Summer party',
          description: '',
          locationName: null,
          address: null,
          allDay: false,
          startsAt,
          endsAt: null,
          timeZone: 'Europe/Berlin',
          rsvpDeadline: null,
          role: 'owner',
          past: false,
          images: [],
          counts: { invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 },
          saveTheDate: null,
          photoStand: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      const read = await agent.get(`${base}/${res.body.event.id}`).expect(200);
      expect(read.body.event).toEqual(res.body.event);
    });

    it('stores all given fields', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(
          upcoming({
            description: '<p>Hi</p>',
            locationName: 'Garden',
            address: 'Main street 1',
            allDay: true,
            endsAt: inDays(12),
            rsvpDeadline: inDays(5),
          }),
        )
        .expect(201);
      expect(res.body.event).toMatchObject({
        description: '<p>Hi</p>',
        locationName: 'Garden',
        address: 'Main street 1',
        allDay: true,
        endsAt: inDays(12).slice(0, 10) + res.body.event.endsAt.slice(10),
        rsvpDeadline: expect.any(String),
      });
    });

    it('turns empty strings of location and address into null', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ locationName: '', address: '  ' }))
        .expect(201);
      expect(res.body.event.locationName).toBeNull();
      expect(res.body.event.address).toBeNull();
    });

    it('sanitizes the description', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ description: '<p><strong>Bold</strong></p><script>alert(1)</script>' }))
        .expect(201);
      expect(res.body.event.description).toBe('<p><strong>Bold</strong></p>');
      expect(res.body.event.description).not.toContain('script');
    });

    it('creates a past event and marks it past', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent.post(base).send(over()).expect(201);
      expect(res.body.event.past).toBe(true);
    });

    it('rejects bad input with 400 and the path of each field', async () => {
      const agent = await signedUpAgent('ada@example.com');

      const empty = await agent.post(base).send({}).expect(400);
      expect(detailPaths(empty)).toEqual(expect.arrayContaining(['title', 'startsAt', 'timeZone']));

      const blank = await agent
        .post(base)
        .send(upcoming({ title: '   ' }))
        .expect(400);
      expect(detailPaths(blank)).toContain('title');

      const long = await agent
        .post(base)
        .send(upcoming({ title: 'x'.repeat(121) }))
        .expect(400);
      expect(detailPaths(long)).toContain('title');

      const date = await agent
        .post(base)
        .send(upcoming({ startsAt: 'tomorrow' }))
        .expect(400);
      expect(detailPaths(date)).toContain('startsAt');

      const noOffset = await agent
        .post(base)
        .send(upcoming({ startsAt: '2027-06-10T10:00:00' }))
        .expect(400);
      expect(detailPaths(noOffset)).toContain('startsAt');

      const allDay = await agent
        .post(base)
        .send(upcoming({ allDay: 'yes' }))
        .expect(400);
      expect(detailPaths(allDay)).toContain('allDay');

      const tooLong = await agent
        .post(base)
        .send(upcoming({ description: 'x'.repeat(20_001) }))
        .expect(400);
      expect(detailPaths(tooLong)).toContain('description');

      const location = await agent
        .post(base)
        .send(upcoming({ locationName: 'x'.repeat(201), address: 'x'.repeat(501) }))
        .expect(400);
      expect(detailPaths(location)).toEqual(expect.arrayContaining(['locationName', 'address']));
    });

    it('rejects an unknown time zone', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ timeZone: 'Mars/Olympus' }))
        .expect(400);
      expect(detailPaths(res)).toContain('timeZone');
    });

    it('rejects an end before the start', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ startsAt: inDays(10), endsAt: inDays(9) }))
        .expect(400);
      expect(detailPaths(res)).toEqual(['endsAt']);
    });

    it('rejects a deadline after the start', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ startsAt: inDays(10), rsvpDeadline: inDays(11) }))
        .expect(400);
      expect(detailPaths(res)).toEqual(['rsvpDeadline']);
    });

    it('accepts an end equal to the start and a deadline equal to the start', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const startsAt = inDays(10);
      await agent
        .post(base)
        .send(upcoming({ startsAt, endsAt: startsAt }))
        .expect(201);
      await agent
        .post(base)
        .send(upcoming({ startsAt, rsvpDeadline: startsAt }))
        .expect(201);
    });
  });

  describe('GET /events', () => {
    it('lists only the own events', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const mine = await createEvent(ada);
      await createEvent(bob, { title: 'Bobs' });

      const list = await ada.get(base).expect(200);
      expect(list.body.events.map((event: { id: string }) => event.id)).toEqual([mine.id]);
      const eve = await signedUpAgent('eve@example.com');
      expect((await eve.get(base).expect(200)).body.events).toEqual([]);
    });

    it('lists upcoming events soonest first, then past events most recent first', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const late = await createEvent(agent, { title: 'late', startsAt: inDays(10) });
      const soon = await createEvent(agent, { title: 'soon', startsAt: inDays(2) });
      const old = await agent.post(base).send(over({ title: 'old', startsAt: inDays(-10) }));
      const recent = await agent.post(base).send(over({ title: 'recent', startsAt: inDays(-3) }));
      expect(old.status).toBe(201);

      const list = await agent.get(base).expect(200);
      expect(list.body.events.map((event: { id: string }) => event.id)).toEqual([
        soon.id,
        late.id,
        recent.body.event.id,
        old.body.event.id,
      ]);
      expect(list.body.events.map((event: { past: boolean }) => event.past)).toEqual([
        false,
        false,
        true,
        true,
      ]);
    });

    it('shows the role of an editor and the images', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      await uploadFiles(owner, event.id, 2).expect(201);

      const list = await editor.get(base).expect(200);
      expect(list.body.events).toHaveLength(1);
      expect(list.body.events[0].role).toBe('editor');
      expect(list.body.events[0].images).toHaveLength(2);

      const ownList = await owner.get(base).expect(200);
      expect(ownList.body.events[0].role).toBe('owner');
    });
  });

  describe('GET /events/:id', () => {
    it('answers 404 for an event of someone else, not 403', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await bob.get(`${base}/${event.id}`).expect(404);
      await bob.get(`${base}/00000000-0000-4000-8000-000000000000`).expect(404);
    });

    it('answers 400 for an id that is no uuid', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent.get(`${base}/not-a-uuid`).expect(400);
      expect(detailPaths(res)).toContain('id');
    });

    it('lets an editor read the event', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      const res = await editor.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.role).toBe('editor');
    });

    it('reads a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = (await agent.post(base).send(over()).expect(201)).body.event;
      const res = await agent.get(`${base}/${event.id}`).expect(200);
      expect(res.body.event.past).toBe(true);
    });
  });

  describe('PATCH /events/:id', () => {
    it('changes only the given fields', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, {
        description: '<p>Keep</p>',
        locationName: 'Garden',
      });

      const res = await agent.patch(`${base}/${event.id}`).send({ title: 'Renamed' }).expect(200);
      expect(res.body.event).toMatchObject({
        id: event.id,
        title: 'Renamed',
        description: '<p>Keep</p>',
        locationName: 'Garden',
        role: 'owner',
        past: false,
      });
      expect(Date.parse(res.body.event.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(res.body.event.createdAt),
      );
    });

    it('can clear optional fields and sanitizes the description', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, {
        locationName: 'Garden',
        endsAt: inDays(11),
      });
      const res = await agent
        .patch(`${base}/${event.id}`)
        .send({ locationName: '', endsAt: null, description: '<em>x</em><script>1</script>' })
        .expect(200);
      expect(res.body.event.locationName).toBeNull();
      expect(res.body.event.endsAt).toBeNull();
      expect(res.body.event.description).toBe('<em>x</em>');
    });

    it('lets an editor update', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      const res = await editor
        .patch(`${base}/${event.id}`)
        .send({ title: 'By editor' })
        .expect(200);
      expect(res.body.event).toMatchObject({ title: 'By editor', role: 'editor' });
    });

    it('checks the order of the times against the stored event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent, {
        startsAt: inDays(5),
        endsAt: inDays(6),
        rsvpDeadline: inDays(4),
      });
      const url = `${base}/${event.id}`;

      // moving the start behind the stored end
      const start = await agent
        .patch(url)
        .send({ startsAt: inDays(7) })
        .expect(400);
      expect(detailPaths(start)).toEqual(['endsAt']);
      // moving the end before the stored start
      const end = await agent
        .patch(url)
        .send({ endsAt: inDays(4.5) })
        .expect(400);
      expect(detailPaths(end)).toEqual(['endsAt']);
      // a deadline after the stored start
      const deadline = await agent
        .patch(url)
        .send({ rsvpDeadline: inDays(5.5) })
        .expect(400);
      expect(detailPaths(deadline)).toEqual(['rsvpDeadline']);
      // a start before the stored deadline
      const early = await agent
        .patch(url)
        .send({ startsAt: inDays(3) })
        .expect(400);
      expect(detailPaths(early)).toEqual(['rsvpDeadline']);

      // moving the start and the end together is fine
      await agent
        .patch(url)
        .send({ startsAt: inDays(8), endsAt: inDays(9), rsvpDeadline: inDays(7) })
        .expect(200);
      // nothing was changed by the failed requests
      const read = await agent.get(url).expect(200);
      expect(read.body.event.startsAt).toBe(
        inDays(8).slice(0, 19) + read.body.event.startsAt.slice(19),
      );
    });

    it('rejects an empty body and bad values', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const url = `${base}/${event.id}`;
      await agent.patch(url).send({}).expect(400);
      expect(detailPaths(await agent.patch(url).send({ title: '' }).expect(400))).toContain(
        'title',
      );
      expect(
        detailPaths(await agent.patch(url).send({ timeZone: 'Nope/Zone' }).expect(400)),
      ).toContain('timeZone');
      expect(detailPaths(await agent.patch(url).send({ startsAt: 'soon' }).expect(400))).toContain(
        'startsAt',
      );
    });

    it('answers 404 for an event of someone else', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await bob.patch(`${base}/${event.id}`).send({ title: 'Mine now' }).expect(404);
      const read = await ada.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.title).toBe('Summer party');
    });

    it('answers 409 for a past event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = (await agent.post(base).send(over()).expect(201)).body.event;
      await agent.patch(`${base}/${event.id}`).send({ title: 'Too late' }).expect(409);
    });
  });

  describe('DELETE /events/:id', () => {
    it('lets the owner delete the event and removes the image files', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await uploadFiles(agent, event.id, 3).expect(201);
      expect(await uploadedFiles()).toHaveLength(3);

      await agent.delete(`${base}/${event.id}`).expect(204);
      await agent.get(`${base}/${event.id}`).expect(404);
      expect(await uploadedFiles()).toEqual([]);
      expect(await db.select().from(eventImages)).toEqual([]);
      expect(await db.select().from(eventMembers)).toEqual([]);
    });

    it('answers 403 for an editor and keeps the event', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await uploadFiles(owner, event.id, 1).expect(201);
      await addEditor(event.id, editor);

      await editor.delete(`${base}/${event.id}`).expect(403);
      await owner.get(`${base}/${event.id}`).expect(200);
      expect(await uploadedFiles()).toHaveLength(1);
    });

    it('answers 404 for an event of someone else', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      await bob.delete(`${base}/${event.id}`).expect(404);
      await ada.get(`${base}/${event.id}`).expect(200);
    });

    it('still works for a past event, with its images', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await uploadFiles(agent, event.id, 2).expect(201);
      await makePast(event.id);
      expect((await agent.get(`${base}/${event.id}`).expect(200)).body.event.past).toBe(true);

      await agent.delete(`${base}/${event.id}`).expect(204);
      expect(await uploadedFiles()).toEqual([]);
    });
  });

  describe('images', () => {
    it('uploads several images with positions 0..n-1', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);

      const first = await uploadFiles(agent, event.id, 3).expect(201);
      expect(first.body.images).toEqual([
        ...[0, 1, 2].map((position) => ({
          id: expect.any(String),
          width: expect.any(Number),
          height: expect.any(Number),
          position,
        })),
      ]);
      // the images are processed (resized), but keep their ratio
      expect(first.body.images[0].width / first.body.images[0].height).toBe(2);

      const second = await uploadFiles(agent, event.id, 2).expect(201);
      expect(second.body.images.map((image: { position: number }) => image.position)).toEqual([
        0, 1, 2, 3, 4,
      ]);
      expect(await uploadedFiles()).toHaveLength(5);

      const read = await agent.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.images).toEqual(second.body.images);
    });

    it('lets an editor upload', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      await uploadFiles(editor, event.id, 1).expect(201);
    });

    it('answers 409 when more than 6 would be stored, and stores nothing', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await uploadFiles(agent, event.id, 4).expect(201);

      await uploadFiles(agent, event.id, 3).expect(409);
      expect(await uploadedFiles()).toHaveLength(4);
      const read = await agent.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.images).toHaveLength(4);

      // exactly up to the limit is fine
      await uploadFiles(agent, event.id, 2).expect(201);
      await uploadFiles(agent, event.id, 1).expect(409);
      expect(await uploadedFiles()).toHaveLength(6);
    });

    it('answers 409 for 7 files in one request and stores nothing', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await uploadFiles(agent, event.id, 7).expect(409);
      expect(await uploadedFiles()).toEqual([]);
      expect(await db.select().from(eventImages)).toEqual([]);
    });

    it('answers 400 for a file that is not an image, and stores nothing', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const url = `${base}/${event.id}/images`;

      await agent.post(url).attach('images', Buffer.from('not an image'), 'a.png').expect(400);
      // one good file next to a bad one stores neither
      await agent
        .post(url)
        .attach('images', await png(), 'ok.png')
        .attach('images', Buffer.from('<svg/>'), 'bad.svg')
        .expect(400);
      expect(await uploadedFiles()).toEqual([]);
      expect(await db.select().from(eventImages)).toEqual([]);
    });

    it('answers 400 without files', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await agent.post(`${base}/${event.id}/images`).expect(400);
    });

    it('answers 404 for the event of someone else', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      const image = (await uploadFiles(ada, event.id, 1).expect(201)).body.images[0];

      await uploadFiles(bob, event.id, 1).expect(404);
      await bob.delete(`${base}/${event.id}/images/${image.id}`).expect(404);
      await bob
        .put(`${base}/${event.id}/images/order`)
        .send({ ids: [image.id] })
        .expect(404);
      expect(await uploadedFiles()).toHaveLength(1);
    });

    it('stores at most 6 when two uploads run in parallel', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);

      const [a, b] = await Promise.all([
        uploadFiles(agent, event.id, 4),
        uploadFiles(agent, event.id, 4),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect(await uploadedFiles()).toHaveLength(4);
      const rows = await db.select().from(eventImages);
      expect(rows.map((row) => row.position).sort()).toEqual([0, 1, 2, 3]);
    });

    it('stores at most 6 when many small uploads run in parallel', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);

      const results = await Promise.all(
        Array.from({ length: 8 }, () => uploadFiles(agent, event.id, 1)),
      );
      expect(results.filter((res) => res.status === 201)).toHaveLength(6);
      expect(results.filter((res) => res.status === 409)).toHaveLength(2);
      expect(await uploadedFiles()).toHaveLength(6);
      const rows = await db.select().from(eventImages);
      expect(rows.map((row) => row.position).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('serves the file as webp to members and hides it from others', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const other = await signedUpAgent('eve@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      const image = (await uploadFiles(owner, event.id, 1).expect(201)).body.images[0];
      const url = `${base}/${event.id}/images/${image.id}`;

      for (const member of [owner, editor]) {
        const res = await member.get(url).expect(200);
        expect(res.headers['content-type']).toBe('image/webp');
        expect(res.body.length).toBeGreaterThan(0);
      }
      await other.get(url).expect(404);
      await request(app).get(url).expect(401);
      await owner
        .get(`${base}/${event.id}/images/00000000-0000-4000-8000-000000000000`)
        .expect(404);
      await owner.get(`${base}/${event.id}/images/not-a-uuid`).expect(400);
    });

    it('does not serve an image through another event', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const one = await createEvent(agent);
      const two = await createEvent(agent);
      const image = (await uploadFiles(agent, one.id, 1).expect(201)).body.images[0];
      await agent.get(`${base}/${two.id}/images/${image.id}`).expect(404);
    });

    it('reorders the images', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const images = (await uploadFiles(agent, event.id, 3).expect(201)).body.images as {
        id: string;
      }[];
      const ids = [images[2]!.id, images[0]!.id, images[1]!.id];

      const res = await agent.put(`${base}/${event.id}/images/order`).send({ ids }).expect(200);
      expect(res.body.images.map((image: { id: string }) => image.id)).toEqual(ids);
      expect(res.body.images.map((image: { position: number }) => image.position)).toEqual([
        0, 1, 2,
      ]);
      const read = await agent.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.images).toEqual(res.body.images);
    });

    it('lets an editor reorder', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      const images = (await uploadFiles(owner, event.id, 2).expect(201)).body.images as {
        id: string;
      }[];
      await editor
        .put(`${base}/${event.id}/images/order`)
        .send({ ids: [images[1]!.id, images[0]!.id] })
        .expect(200);
    });

    it('rejects an order with a missing, duplicate or foreign id', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const other = await createEvent(agent);
      const images = (await uploadFiles(agent, event.id, 3).expect(201)).body.images as {
        id: string;
      }[];
      const foreign = (await uploadFiles(agent, other.id, 1).expect(201)).body.images[0];
      const [a, b, c] = images.map((image) => image.id) as [string, string, string];
      const url = `${base}/${event.id}/images/order`;

      const missing = await agent
        .put(url)
        .send({ ids: [a, b] })
        .expect(400);
      expect(detailPaths(missing)).toEqual(['ids']);
      await agent
        .put(url)
        .send({ ids: [a, a, b] })
        .expect(400);
      await agent
        .put(url)
        .send({ ids: [a, b, foreign.id] })
        .expect(400);
      await agent
        .put(url)
        .send({ ids: [a, b, c, foreign.id] })
        .expect(400);
      await agent
        .put(url)
        .send({ ids: [a, b, '00000000-0000-4000-8000-000000000000'] })
        .expect(400);
      await agent
        .put(url)
        .send({ ids: ['x', b, c] })
        .expect(400);
      await agent.put(url).send({ ids: [] }).expect(400);
      await agent.put(url).send({}).expect(400);

      // the order is unchanged
      const read = await agent.get(`${base}/${event.id}`).expect(200);
      expect(read.body.event.images.map((image: { id: string }) => image.id)).toEqual([a, b, c]);
    });

    it('deletes an image, renumbers the rest and removes the file', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const images = (await uploadFiles(agent, event.id, 3).expect(201)).body.images as {
        id: string;
      }[];
      expect(await uploadedFiles()).toHaveLength(3);

      const res = await agent.delete(`${base}/${event.id}/images/${images[0]!.id}`).expect(200);
      expect(res.body.images).toEqual([
        expect.objectContaining({ id: images[1]!.id, position: 0 }),
        expect.objectContaining({ id: images[2]!.id, position: 1 }),
      ]);
      expect(await uploadedFiles()).toHaveLength(2);
      await agent.get(`${base}/${event.id}/images/${images[0]!.id}`).expect(404);

      // deleting it again, and an unknown id
      await agent.delete(`${base}/${event.id}/images/${images[0]!.id}`).expect(404);

      // a new upload continues after the renumbered ones
      const more = await uploadFiles(agent, event.id, 1).expect(201);
      expect(more.body.images.map((image: { position: number }) => image.position)).toEqual([
        0, 1, 2,
      ]);
    });

    it('lets an editor delete an image', async () => {
      const owner = await signedUpAgent('ada@example.com');
      const editor = await signedUpAgent('bob@example.com');
      const event = await createEvent(owner);
      await addEditor(event.id, editor);
      const image = (await uploadFiles(owner, event.id, 1).expect(201)).body.images[0];
      await editor.delete(`${base}/${event.id}/images/${image.id}`).expect(200);
      expect(await uploadedFiles()).toEqual([]);
    });

    it('answers 409 on writes to a past event but still serves the files', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const image = (await uploadFiles(agent, event.id, 2).expect(201)).body.images[0];
      await makePast(event.id);

      await uploadFiles(agent, event.id, 1).expect(409);
      await agent.delete(`${base}/${event.id}/images/${image.id}`).expect(409);
      await agent
        .put(`${base}/${event.id}/images/order`)
        .send({ ids: [image.id] })
        .expect(409);
      expect(await uploadedFiles()).toHaveLength(2);

      await agent.get(`${base}/${event.id}/images/${image.id}`).expect(200);
    });
  });

  describe('links in the description', () => {
    const rel = 'target="_blank" rel="noopener noreferrer nofollow"';
    const cases: [string, string][] = [
      ['https://example.com/a?b=1', `<a href="https://example.com/a?b=1" ${rel}>x</a>`],
      ['http://example.com', `<a href="http://example.com" ${rel}>x</a>`],
      // only external links open in a new tab
      ['mailto:ada@example.com', '<a href="mailto:ada@example.com">x</a>'],
      ['//evil.example', '<a>x</a>'],
      ['/api/v1/x', '<a>x</a>'],
      ['javascript:alert(1)', '<a>x</a>'],
      ['data:text/html,<b>1</b>', '<a>x</a>'],
      ['', '<a>x</a>'],
      [' https://example.com', '<a>x</a>'],
      ['tel:+4912345', '<a>x</a>'],
    ];

    it.each(cases)('keeps or drops the href %j on create', async (href, expected) => {
      const agent = await signedUpAgent('ada@example.com');
      const res = await agent
        .post(base)
        .send(upcoming({ description: `<a href="${href.replace(/"/g, '&quot;')}">x</a>` }))
        .expect(201);
      expect(res.body.event.description).toBe(expected);
    });

    it('applies the same rule on update and drops a link without href', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      const res = await agent
        .patch(`${base}/${event.id}`)
        .send({
          description:
            '<a href="//evil.example">a</a><a href="https://example.com">b</a><a>c</a><a href="javascript:alert(1)" onclick="x()">d</a>',
        })
        .expect(200);
      expect(res.body.event.description).toBe(
        `<a>a</a><a href="https://example.com" ${rel}>b</a><a>c</a><a>d</a>`,
      );
    });
  });

  describe('upload parsing', () => {
    it('answers 400 for an extra text field and stores nothing', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await agent
        .post(`${base}/${event.id}/images`)
        .field('x', 'y')
        .attach('images', sample, 'a.png')
        .expect(400);
      expect(await uploadedFiles()).toEqual([]);
      expect(await db.select().from(eventImages)).toEqual([]);
    });

    it('answers 404 to a non-member before the files are parsed', async () => {
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const event = await createEvent(ada);
      const url = `${base}/${event.id}/images`;

      // with parsed files these would be 400 (text field) or a limit error
      await bob.post(url).field('x', 'y').attach('images', sample, 'a.png').expect(404);
      await uploadFiles(bob, event.id, 7).expect(404);
      await bob.post(url).attach('images', Buffer.from('not an image'), 'a.png').expect(404);
      await bob
        .post(`${base}/00000000-0000-4000-8000-000000000000/images`)
        .attach('images', sample, 'a.png')
        .expect(404);
      expect(await uploadedFiles()).toEqual([]);
    });

    it('answers 409 for a past event before the files are parsed', async () => {
      const agent = await signedUpAgent('ada@example.com');
      const event = await createEvent(agent);
      await makePast(event.id);
      const url = `${base}/${event.id}/images`;

      await agent.post(url).field('x', 'y').attach('images', sample, 'a.png').expect(409);
      await agent.post(url).attach('images', Buffer.from('not an image'), 'a.png').expect(409);
      await uploadFiles(agent, event.id, 7).expect(409);
      expect(await uploadedFiles()).toEqual([]);
    });
  });

  describe('deleting a user', () => {
    it('removes the events they own with their files and keeps events where they only edit', async () => {
      const admin = await adminAgent();
      const ada = await signedUpAgent('ada@example.com');
      const bob = await signedUpAgent('bob@example.com');
      const adaId = await userId(ada);
      const bobId = await userId(bob);

      const owned = await createEvent(ada, { title: 'Ada owns' });
      const ownedPast = await createEvent(ada, { title: 'Ada owned' });
      await uploadFiles(ada, owned.id, 2).expect(201);
      await uploadFiles(ada, ownedPast.id, 1).expect(201);
      await makePast(ownedPast.id);
      const shared = await createEvent(bob, { title: 'Bob owns' });
      await addEditor(shared.id, ada);
      await uploadFiles(bob, shared.id, 1).expect(201);
      expect(await uploadedFiles()).toHaveLength(4);

      await admin.delete(`${apiPrefix}/admin/users/${adaId}`).expect(204);

      const remaining = await db.select().from(events);
      expect(remaining.map((event) => event.id)).toEqual([shared.id]);
      expect(await db.select().from(eventMembers)).toEqual([
        expect.objectContaining({ eventId: shared.id, userId: bobId, role: 'owner' }),
      ]);
      expect(await uploadedFiles()).toHaveLength(1);
      expect(await db.select().from(eventImages)).toHaveLength(1);

      const read = await bob.get(`${base}/${shared.id}`).expect(200);
      expect(read.body.event.images).toHaveLength(1);
    });
  });
});
