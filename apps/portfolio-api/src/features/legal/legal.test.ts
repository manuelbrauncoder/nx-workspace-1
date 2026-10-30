import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { legalPageKeys } from './legal.schemas.js';
import { seedLegal } from './legal.seed.js';

const imprint = {
  de: '<h2>Angaben</h2><p>Ada Lovelace</p>',
  en: '<h2>Details</h2><p>Ada Lovelace</p>',
};

describe('legal', () => {
  it('answers 404 for a page that was not created yet', async () => {
    await request(app).get('/api/v1/legal/imprint').expect(404);

    const admin = await adminAgent();
    const res = await admin.get('/api/v1/legal').expect(200);
    expect(res.body).toEqual(Object.fromEntries(legalPageKeys.map((key) => [key, null])));
  });

  it('allows changes to admins only', async () => {
    await request(app).patch('/api/v1/legal/imprint').send(imprint).expect(401);
    await request(app).get('/api/v1/legal').expect(401);

    const user = await signedUpAgent('ada@example.com');
    await user.patch('/api/v1/legal/imprint').send(imprint).expect(403);
    await user.get('/api/v1/legal').expect(403);
  });

  it('serves the page as an HTML fragment in the requested language', async () => {
    const admin = await adminAgent();
    const saved = await admin.patch('/api/v1/legal/imprint').send(imprint).expect(200);
    expect(saved.body.imprint).toMatchObject(imprint);

    const de = await request(app).get('/api/v1/legal/imprint').expect(200);
    expect(de.type).toBe('text/html');
    expect(de.headers['content-language']).toBe('de');
    expect(de.text).toBe(imprint.de);

    const en = await request(app).get('/api/v1/legal/imprint?lang=en').expect(200);
    expect(en.headers['content-language']).toBe('en');
    expect(en.text).toBe(imprint.en);

    await request(app).get('/api/v1/legal/imprint?lang=fr').expect(400);
  });

  it('creates a page with both languages and changes only the sent ones', async () => {
    const admin = await adminAgent();
    // a single language cannot create a page
    await admin.patch('/api/v1/legal/privacy').send({ de: '<p>Nur Deutsch</p>' }).expect(404);
    await admin.patch('/api/v1/legal/privacy').send({}).expect(400);
    await admin.patch('/api/v1/legal/privacy').send({ de: ' ', en: '<p>x</p>' }).expect(400);

    await admin.patch('/api/v1/legal/privacy').send(imprint).expect(200);
    const changed = await admin
      .patch('/api/v1/legal/privacy')
      .send({ en: '<p>New</p>' })
      .expect(200);
    expect(changed.body.privacy).toMatchObject({ de: imprint.de, en: '<p>New</p>' });

    const res = await request(app).get('/api/v1/legal/privacy?lang=en').expect(200);
    expect(res.text).toBe('<p>New</p>');
  });

  it('sanitizes the HTML before it is stored', async () => {
    const admin = await adminAgent();
    const html =
      '<section><h1>Titel</h1><h2 onclick="steal()">Kontakt</h2><script>alert(1)</script>' +
      '<p><a href="mailto:ada@example.com">Mail</a> <a href="tel:+491234">Tel</a> ' +
      '<a href="/privacy">Datenschutz</a> <a href="javascript:alert(1)">x</a></p>' +
      '<img src="x" onerror="alert(1)"><address><p>Ada<br>London</p></address></section>';
    await admin.patch('/api/v1/legal/accessibility').send({ de: html, en: html }).expect(200);

    const res = await request(app).get('/api/v1/legal/accessibility').expect(200);
    expect(res.text).toBe(
      'Titel<h2>Kontakt</h2>' +
        '<p><a href="mailto:ada@example.com">Mail</a> <a href="tel:+491234">Tel</a> ' +
        '<a href="/privacy">Datenschutz</a> <a>x</a></p>' +
        '<p>Ada<br />London</p>',
    );
  });

  it('seeds every page once and leaves existing ones alone', async () => {
    const admin = await adminAgent();
    await admin.patch('/api/v1/legal/imprint').send(imprint).expect(200);

    expect(await seedLegal('seed')).toEqual(['privacy', 'accessibility', 'cookies']);
    expect(await seedLegal('seed')).toEqual([]);

    const kept = await request(app).get('/api/v1/legal/imprint').expect(200);
    expect(kept.text).toBe(imprint.de);
    const cookies = await request(app).get('/api/v1/legal/cookies?lang=en').expect(200);
    expect(cookies.text).toContain('<h2>What is stored</h2>');
  });
});
