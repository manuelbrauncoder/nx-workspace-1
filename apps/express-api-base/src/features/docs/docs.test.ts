import { userSchema } from '@contracts/auth';
import { noteImageSchema, noteSchema } from '@contracts/notes';
import type { Router } from 'express';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { adminRouter } from '../admin/admin.routes.js';
import { authRouter } from '../auth/auth.routes.js';
import { notesRouter } from '../notes/notes.routes.js';
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
      ...routesOf('/auth', authRouter),
      ...routesOf('/notes', notesRouter),
      ...routesOf('/admin', adminRouter),
    ];

    expect(documented.sort()).toEqual(implemented.sort());
  });

  it('documents the response shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const me = await agent.get('/auth/me').expect(200);
    expect(userSchema.strict().safeParse(me.body.user).error).toBeUndefined();

    const created = await agent.post('/notes').send({ title: 'Note' }).expect(201);
    const { id } = created.body.note;
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    const upload = await agent.post(`/notes/${id}/images`).attach('images', png, 'a.png');
    expect(noteImageSchema.strict().safeParse(upload.body.images[0]).error).toBeUndefined();

    const note = await agent.get(`/notes/${id}`).expect(200);
    expect(noteSchema.strict().safeParse(note.body.note).error).toBeUndefined();
    expect(note.body.note.images).toHaveLength(1);

    const admin = await adminAgent();
    const list = await admin.get('/admin/users').expect(200);
    expect(list.body.users).toHaveLength(2);
    for (const user of list.body.users) {
      expect(userSchema.strict().safeParse(user).error).toBeUndefined();
    }
  });
});
