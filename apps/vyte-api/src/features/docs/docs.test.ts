import { accountInviteSchema, publicAccountInviteSchema } from '@contracts/account-invites';
import { userSchema } from '@contracts/auth';
import {
  accountInvitesAdminRouter,
  accountInvitesRouter,
} from '@server/auth/account-invites.routes';
import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import { db } from '@server/core/db/db';
import { eventImageSchema, eventSchema, saveTheDateSchema } from '@vyte/contracts/events';
import { guestSchema, invitationSchema } from '@vyte/contracts/guests';
import { editorInviteSchema, memberSchema, publicEditorInviteSchema } from '@vyte/contracts/team';
import { eq } from 'drizzle-orm';
import type { Router } from 'express';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import { apiPrefix } from '../../shared/api.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { eventsRouter } from '../events/events.routes.js';
import { events } from '../events/events.table.js';
import { guestsRouter } from '../guests/guests.routes.js';
import { invitesRouter } from '../invites/invites.routes.js';
import { rsvpRouter } from '../rsvp/rsvp.routes.js';
import {
  saveTheDateRouter,
  saveTheDateSettingsRouter,
} from '../save-the-date/save-the-date.routes.js';
import { teamRouter } from '../team/team.routes.js';
import { buildDocs } from './docs.document.js';

/** "POST /api/v1/auth/sign-in" for every route registered on the router. */
function routesOf(prefix: string, router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route as { path: string; methods: Record<string, boolean> } | undefined;
    if (!route) return [];
    const path = (prefix + route.path).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${path}`);
  });
}

/** `invitationSchema` is a union, so each variant and its nested objects are made strict here. */
function strictInvitation(value: unknown) {
  const [open, past] = invitationSchema.options;
  return (
    (value as { past?: boolean })?.past
      ? past.strict()
      : open.extend({ event: open.shape.event.strict(), guest: open.shape.guest.strict() }).strict()
  ).safeParse(value);
}

/** `saveTheDateSchema` is a union, so each variant is made strict here. */
function strictSaveTheDate(value: unknown) {
  const [open, past] = saveTheDateSchema.options;
  return ((value as { past?: boolean })?.past ? past : open).strict().safeParse(value);
}

describe('docs', () => {
  it('reports the version of the app in /health', async () => {
    const health = await request(app).get('/health').expect(200);
    expect(health.body).toEqual({ status: 'ok', version: packageJson.version });
  });

  it('serves the spec and the docs page', async () => {
    const spec = await request(app).get('/docs/openapi.json').expect(200);
    expect(spec.body.openapi).toBe('3.1.0');

    const page = await request(app).get('/docs/').expect(200);
    expect(page.text).toContain('swagger-ui');
  });

  it('documents exactly the routes that exist', () => {
    const documented = Object.entries(buildDocs().paths ?? {})
      .flatMap(([path, operations]) =>
        Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
      )
      .filter((route) => route !== 'GET /health');

    const implemented = [
      ...routesOf(`${apiPrefix}/auth/account-invites`, accountInvitesRouter),
      ...routesOf(`${apiPrefix}/admin/account-invites`, accountInvitesAdminRouter),
      ...routesOf(`${apiPrefix}/auth`, authRouter),
      ...routesOf(`${apiPrefix}/admin`, adminRouter),
      ...routesOf(`${apiPrefix}/events/{id}/guests`, guestsRouter),
      ...routesOf(`${apiPrefix}/events`, eventsRouter),
      ...routesOf(`${apiPrefix}/rsvp`, rsvpRouter),
      ...routesOf(`${apiPrefix}/events/{id}`, teamRouter),
      ...routesOf(`${apiPrefix}/invites`, invitesRouter),
      ...routesOf(`${apiPrefix}/events/{id}/save-the-date`, saveTheDateSettingsRouter),
      ...routesOf(`${apiPrefix}/save-the-date`, saveTheDateRouter),
    ];

    expect(documented.sort()).toEqual(implemented.sort());
  });

  it('documents the response shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const me = await agent.get(`${apiPrefix}/auth/me`).expect(200);
    expect(userSchema.strict().safeParse(me.body.user).error).toBeUndefined();

    const admin = await adminAgent();
    const list = await admin.get(`${apiPrefix}/admin/users`).expect(200);
    expect(list.body.users).toHaveLength(2);
    for (const user of list.body.users) {
      expect(userSchema.strict().safeParse(user).error).toBeUndefined();
    }
  });

  it('documents the event shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const created = await agent
      .post(`${apiPrefix}/events`)
      .send({
        title: 'Party',
        description: '<p>Hi</p>',
        locationName: 'Garden',
        startsAt: '2999-06-10T16:00:00.000Z',
        endsAt: '2999-06-10T20:00:00.000Z',
        rsvpDeadline: '2999-06-01T16:00:00.000Z',
        timeZone: 'Europe/Berlin',
      })
      .expect(201);
    expect(eventSchema.strict().safeParse(created.body.event).error).toBeUndefined();
    const { id } = created.body.event;

    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    const upload = await agent
      .post(`${apiPrefix}/events/${id}/images`)
      .attach('images', png, 'a.png')
      .expect(201);
    expect(upload.body.images).toHaveLength(1);
    expect(eventImageSchema.strict().safeParse(upload.body.images[0]).error).toBeUndefined();

    const read = await agent.get(`${apiPrefix}/events/${id}`).expect(200);
    expect(read.body.event.images).toHaveLength(1);
    expect(eventSchema.strict().safeParse(read.body.event).error).toBeUndefined();

    const list = await agent.get(`${apiPrefix}/events`).expect(200);
    expect(list.body.events).toHaveLength(1);
    expect(eventSchema.strict().safeParse(list.body.events[0]).error).toBeUndefined();
  });

  it('documents the guest and invitation shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const created = await agent
      .post(`${apiPrefix}/events`)
      .send({ title: 'Party', startsAt: '2999-06-10T16:00:00.000Z', timeZone: 'Europe/Berlin' })
      .expect(201);
    const { id } = created.body.event;
    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    await agent.post(`${apiPrefix}/events/${id}/images`).attach('images', png, 'a.png').expect(201);

    const added = await agent
      .post(`${apiPrefix}/events/${id}/guests`)
      .send({ name: 'Grace', note: 'Friend', maxCompanions: 2 })
      .expect(201);
    expect(guestSchema.strict().safeParse(added.body.guest).error).toBeUndefined();

    const bulk = await agent
      .post(`${apiPrefix}/events/${id}/guests/bulk`)
      .send({ names: ['Alan', 'Linus'] })
      .expect(201);
    for (const guest of bulk.body.guests) {
      expect(guestSchema.strict().safeParse(guest).error).toBeUndefined();
    }

    const { token } = added.body.guest;
    const before = await request(app).get(`${apiPrefix}/rsvp/${token}`).expect(200);
    expect(before.body.invitation.past).toBe(false);
    expect(strictInvitation(before.body.invitation).error).toBeUndefined();

    const answered = await request(app)
      .put(`${apiPrefix}/rsvp/${token}`)
      .send({ response: 'accepted', companions: 1, message: 'Hi' })
      .expect(200);
    expect(strictInvitation(answered.body.invitation).error).toBeUndefined();

    const answeredByHost = await agent
      .put(`${apiPrefix}/events/${id}/guests/${added.body.guest.id}/response`)
      .send({ response: 'declined' })
      .expect(200);
    expect(guestSchema.strict().safeParse(answeredByHost.body.guest).error).toBeUndefined();

    const list = await agent.get(`${apiPrefix}/events/${id}/guests`).expect(200);
    for (const guest of list.body.guests) {
      expect(guestSchema.strict().safeParse(guest).error).toBeUndefined();
    }

    // the strict schema holds for the invitation of an event that is over
    await db
      .update(events)
      .set({ startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), endsAt: null })
      .where(eq(events.id, id));
    const after = await request(app).get(`${apiPrefix}/rsvp/${token}`).expect(200);
    expect(after.body.invitation).toEqual({ past: true, event: { title: 'Party' } });
    expect(strictInvitation(after.body.invitation).error).toBeUndefined();
  });

  it('documents the account link shapes the API really returns', async () => {
    const admin = await adminAgent();
    const created = await admin
      .post(`${apiPrefix}/admin/account-invites`)
      .send({ name: 'Ada' })
      .expect(201);
    expect(accountInviteSchema.strict().safeParse(created.body.invite).error).toBeUndefined();

    const list = await admin.get(`${apiPrefix}/admin/account-invites`).expect(200);
    expect(list.body.invites).toHaveLength(1);
    expect(accountInviteSchema.strict().safeParse(list.body.invites[0]).error).toBeUndefined();

    const token = created.body.invite.token;
    const publicInvite = await request(app)
      .get(`${apiPrefix}/auth/account-invites/${token}`)
      .expect(200);
    expect(
      publicAccountInviteSchema.strict().safeParse(publicInvite.body.invite).error,
    ).toBeUndefined();
  });

  it('documents the member and editor invite shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const grace = await signedUpAgent('grace@example.com');
    const created = await agent
      .post(`${apiPrefix}/events`)
      .send({ title: 'Party', startsAt: '2999-06-10T16:00:00.000Z', timeZone: 'Europe/Berlin' })
      .expect(201);
    const { id } = created.body.event;

    const invite = await agent.post(`${apiPrefix}/events/${id}/invites`).expect(201);
    expect(editorInviteSchema.strict().safeParse(invite.body.invite).error).toBeUndefined();
    const list = await agent.get(`${apiPrefix}/events/${id}/invites`).expect(200);
    expect(list.body.invites).toHaveLength(1);
    expect(editorInviteSchema.strict().safeParse(list.body.invites[0]).error).toBeUndefined();

    const token = invite.body.invite.token;
    const publicInvite = await request(app).get(`${apiPrefix}/invites/${token}`).expect(200);
    expect(
      publicEditorInviteSchema.strict().safeParse(publicInvite.body.invite).error,
    ).toBeUndefined();

    await grace.post(`${apiPrefix}/invites/${token}/accept`).expect(200);
    const members = await agent.get(`${apiPrefix}/events/${id}/members`).expect(200);
    expect(members.body.members).toHaveLength(2);
    for (const member of members.body.members) {
      expect(memberSchema.strict().safeParse(member).error).toBeUndefined();
    }

    const graceId = members.body.members[1].userId;
    const handOver = await agent
      .put(`${apiPrefix}/events/${id}/owner`)
      .send({ userId: graceId })
      .expect(200);
    for (const member of handOver.body.members) {
      expect(memberSchema.strict().safeParse(member).error).toBeUndefined();
    }
  });

  it('documents the save-the-date shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const created = await agent
      .post(`${apiPrefix}/events`)
      .send({
        title: 'Party',
        locationName: 'Garden',
        startsAt: '2999-06-10T16:00:00.000Z',
        timeZone: 'Europe/Berlin',
      })
      .expect(201);
    const { id } = created.body.event;
    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    await agent.post(`${apiPrefix}/events/${id}/images`).attach('images', png, 'a.png').expect(201);

    const on = await agent
      .put(`${apiPrefix}/events/${id}/save-the-date`)
      .send({ note: 'Details follow' })
      .expect(200);
    expect(eventSchema.strict().safeParse(on.body.event).error).toBeUndefined();
    expect(on.body.event.saveTheDate).toEqual({
      token: expect.any(String),
      note: 'Details follow',
    });

    const { token } = on.body.event.saveTheDate;
    const upcoming = await request(app).get(`${apiPrefix}/save-the-date/${token}`).expect(200);
    expect(upcoming.body.saveTheDate.past).toBe(false);
    expect(upcoming.body.saveTheDate.cover).not.toBeNull();
    expect(strictSaveTheDate(upcoming.body.saveTheDate).error).toBeUndefined();

    const off = await agent.delete(`${apiPrefix}/events/${id}/save-the-date`).expect(200);
    expect(eventSchema.strict().safeParse(off.body.event).error).toBeUndefined();
    const again = await agent.put(`${apiPrefix}/events/${id}/save-the-date`).send({}).expect(200);
    const renewed = await agent.post(`${apiPrefix}/events/${id}/save-the-date/token`).expect(200);
    expect(eventSchema.strict().safeParse(renewed.body.event).error).toBeUndefined();

    // the strict schema holds for the variant after the event
    await db
      .update(events)
      .set({ startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), endsAt: null })
      .where(eq(events.id, id));
    const past = await request(app)
      .get(`${apiPrefix}/save-the-date/${renewed.body.event.saveTheDate.token}`)
      .expect(200);
    expect(past.body.saveTheDate).toEqual({ past: true, title: 'Party' });
    expect(strictSaveTheDate(past.body.saveTheDate).error).toBeUndefined();
    expect(again.body.event.saveTheDate.note).toBeNull();
  });
});
