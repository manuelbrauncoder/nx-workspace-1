import { userSchema } from '@contracts/auth';
import { noteImageSchema, noteSchema } from '@contracts/notes';
import { contactMessageSchema } from '@portfolio/contracts/contact';
import { legalPagesSchema } from '@portfolio/contracts/legal';
import { mediaSchema } from '@portfolio/contracts/media';
import {
  localizedPageSchema,
  localizedSectionSchemas,
  pageSchema,
  sectionKeys,
  sectionSchemas,
} from '@portfolio/contracts/portfolio';
import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import type { Router } from 'express';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { contactRouter } from '../contact/contact.routes.js';
import { legalRouter } from '../legal/legal.routes.js';
import { seedLegal } from '../legal/legal.seed.js';
import { mediaRouter } from '../media/media.routes.js';
import { notesRouter } from '../notes/notes.routes.js';
import { portfolioRouter } from '../portfolio/portfolio.routes.js';
import { seedPortfolio } from '../portfolio/portfolio.seed.js';
import { buildDocs } from './docs.document.js';

/** "POST /notes/{id}/images" for every route registered on the router. */
function routesOf(prefix: string, router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route as { path: string; methods: Record<string, boolean> } | undefined;
    if (!route) return [];
    const path = (prefix + route.path).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${path}`);
  });
}

describe('docs', () => {
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
      ...routesOf('/api/v1/auth', authRouter),
      ...routesOf('/api/v1/notes', notesRouter),
      ...routesOf('/api/v1/admin', adminRouter),
      ...routesOf('/api/v1/portfolio', portfolioRouter),
      ...routesOf('/api/v1/media', mediaRouter),
      ...routesOf('/api/v1/contact', contactRouter),
      ...routesOf('/api/v1/legal', legalRouter),
    ];

    expect(documented.sort()).toEqual(implemented.sort());
  });

  it('documents the response shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const me = await agent.get('/api/v1/auth/me').expect(200);
    expect(userSchema.strict().safeParse(me.body.user).error).toBeUndefined();

    const created = await agent.post('/api/v1/notes').send({ title: 'Note' }).expect(201);
    const { id } = created.body.note;
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    const upload = await agent.post(`/api/v1/notes/${id}/images`).attach('images', png, 'a.png');
    expect(noteImageSchema.strict().safeParse(upload.body.images[0]).error).toBeUndefined();

    const note = await agent.get(`/api/v1/notes/${id}`).expect(200);
    expect(noteSchema.strict().safeParse(note.body.note).error).toBeUndefined();
    expect(note.body.note.images).toHaveLength(1);

    const admin = await adminAgent();
    const list = await admin.get('/api/v1/admin/users').expect(200);
    expect(list.body.users).toHaveLength(2);
    for (const user of list.body.users) {
      expect(userSchema.strict().safeParse(user).error).toBeUndefined();
    }

    const media = await admin.post('/api/v1/media').attach('file', png, 'a.png').expect(201);
    expect(mediaSchema.strict().safeParse(media.body.media).error).toBeUndefined();
  });

  it('documents the portfolio content the API really returns', async () => {
    await seedPortfolio('seed');

    const full = await request(app).get('/api/v1/portfolio').expect(200);
    expect(pageSchema.strict().safeParse(full.body).error).toBeUndefined();
    const localized = await request(app).get('/api/v1/portfolio?lang=en').expect(200);
    expect(localizedPageSchema.strict().safeParse(localized.body).error).toBeUndefined();

    // the seed fills every field, so the strict checks see each one
    for (const key of sectionKeys) {
      expect(sectionSchemas[key].strict().safeParse(full.body[key]).error).toBeUndefined();
      expect(
        localizedSectionSchemas[key].strict().safeParse(localized.body[key]).error,
      ).toBeUndefined();
    }

    const admin = await adminAgent();
    const changed = await admin
      .patch('/api/v1/portfolio/contact')
      .send({ headline: full.body.contact.headline });
    expect(sectionSchemas.contact.strict().safeParse(changed.body.contact).error).toBeUndefined();

    await request(app)
      .post('/api/v1/contact')
      .send({ name: 'Ada', email: 'ada@example.com', message: 'Hi' })
      .expect(204);
    const inbox = await admin.get('/api/v1/contact/messages').expect(200);
    expect(contactMessageSchema.strict().safeParse(inbox.body.messages[0]).error).toBeUndefined();
  });

  it('documents the legal pages the API really returns', async () => {
    await seedLegal('seed');

    const admin = await adminAgent();
    const pages = await admin.get('/api/v1/legal').expect(200);
    expect(legalPagesSchema.strict().safeParse(pages.body).error).toBeUndefined();

    const imprint = await request(app).get('/api/v1/legal/imprint?lang=en').expect(200);
    expect(imprint.type).toBe('text/html');
  });
});
