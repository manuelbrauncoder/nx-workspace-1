import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_IMAGES_MAX,
  sectionKeys,
} from '@portfolio/contracts/portfolio';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { adminAgent, app, signedUpAgent, uploadedMediaId } from '../../test/helpers.js';
import { seedPortfolio } from './portfolio.seed.js';

const l = <T>(de: T, en: T) => ({ de, en });

const hero = {
  name: 'Ada Lovelace',
  description: l('Hallo', 'Hello'),
  mapPlace: l('London', 'London'),
  mapCoordinates: '51°30′ N  0°07′ W',
};

const skills = {
  headline: l('Fähigkeiten', 'Skills'),
  description: l('Was ich kann', 'What I do'),
  sets: [
    {
      title: l('Frontend', 'Frontend'),
      skills: [{ name: l('Angular', 'Angular'), points: l(['Signals'], ['Signals']) }],
    },
    { title: l('Backend', 'Backend'), skills: [] },
  ],
};

const projectsSection = (items: unknown[]) => ({
  headline: l('Projekte', 'Projects'),
  description: l('Meine Arbeit', 'My work'),
  items,
});

const project = (imageIds: string[], description = l('<p>Hallo</p>', '<p>Hello</p>')) => ({
  title: 'Kochwelt',
  description,
  stack: ['Angular'],
  images: imageIds.map((id) => ({
    id,
    alt: l(`Bild ${id}`, `Image ${id}`),
  })),
});

describe('portfolio', () => {
  it('returns every section as null before it is created', async () => {
    const res = await request(app).get('/api/v1/portfolio').expect(200);
    expect(res.body).toEqual(Object.fromEntries(sectionKeys.map((key) => [key, null])));
  });

  it('allows changes to admins only', async () => {
    await request(app).post('/api/v1/portfolio/hero').send(hero).expect(401);

    const user = await signedUpAgent('ada@example.com');
    await user.post('/api/v1/portfolio/hero').send(hero).expect(403);
    await user.patch('/api/v1/portfolio/hero').send({ name: 'Bob' }).expect(403);
  });

  it('creates a section once and changes only the sent fields', async () => {
    const admin = await adminAgent();

    const created = await admin.post('/api/v1/portfolio/hero').send(hero).expect(201);
    expect(created.body.hero).toEqual(hero);
    await admin.post('/api/v1/portfolio/hero').send(hero).expect(409);

    const changed = await admin.patch('/api/v1/portfolio/hero').send({ name: ' Ada ' }).expect(200);
    expect(changed.body.hero).toEqual({ ...hero, name: 'Ada' });

    // null removes an optional field
    const cleared = await admin
      .patch('/api/v1/portfolio/hero')
      .send({ mapPlace: null })
      .expect(200);
    expect(cleared.body.hero).not.toHaveProperty('mapPlace');
    expect(cleared.body.hero.mapCoordinates).toBe(hero.mapCoordinates);

    const page = await request(app).get('/api/v1/portfolio').expect(200);
    expect(page.body.hero).toEqual(cleared.body.hero);
  });

  it('replaces arrays as a whole and keeps their order', async () => {
    const admin = await adminAgent();
    await admin.post('/api/v1/portfolio/skills').send(skills).expect(201);

    const reordered = [skills.sets[1], skills.sets[0]];
    const res = await admin.patch('/api/v1/portfolio/skills').send({ sets: reordered }).expect(200);
    expect(res.body.skills.sets).toEqual(reordered);

    const single = await admin.patch('/api/v1/portfolio/skills').send({ sets: [skills.sets[0]] });
    expect(single.body.skills.sets).toEqual([skills.sets[0]]);
    expect(single.body.skills.headline).toEqual(skills.headline);
  });

  it('validates input', async () => {
    const admin = await adminAgent();

    // both languages are required
    await admin
      .post('/api/v1/portfolio/hero')
      .send({ ...hero, description: { de: 'Hallo' } })
      .expect(400);
    await admin.patch('/api/v1/portfolio/hero').send({ name: 'Ada' }).expect(404);

    await admin.post('/api/v1/portfolio/hero').send(hero).expect(201);
    await admin.patch('/api/v1/portfolio/hero').send({}).expect(400);
    // only optional fields can be removed
    await admin.patch('/api/v1/portfolio/hero').send({ name: null }).expect(400);

    await admin
      .post('/api/v1/portfolio/settings')
      .send({
        name: 'Ada',
        email: 'ada@example.com',
        profiles: { github: 'javascript:alert(1)', linkedin: 'https://linkedin.com/in/ada' },
      })
      .expect(400);

    await request(app).get('/api/v1/portfolio?lang=fr').expect(400);
  });

  it('rejects references to images that were not uploaded', async () => {
    const admin = await adminAgent();
    const res = await admin
      .post('/api/v1/portfolio/seo')
      .send({
        title: l('Titel', 'Title'),
        description: l('Beschreibung', 'Description'),
        ogImage: { id: '00000000-0000-4000-8000-000000000000', alt: l('Logo', 'Logo') },
      })
      .expect(400);
    expect(res.body.error.message).toContain('Unknown image');
  });

  it('resolves images and reduces the page to one language', async () => {
    const admin = await adminAgent();
    const imageId = await uploadedMediaId(admin);

    await admin
      .post('/api/v1/portfolio/about')
      .send({
        headline: l('Über mich', 'About me'),
        description: l('Text', 'Text'),
        facts: l(['Eins', 'Zwei'], ['One', 'Two']),
        image: { id: imageId, alt: l('Porträt', 'Portrait') },
      })
      .expect(201);
    await admin.post('/api/v1/portfolio/hero').send(hero).expect(201);

    const full = await request(app).get('/api/v1/portfolio').expect(200);
    expect(full.body.about.image).toEqual({
      id: imageId,
      url: `${config.publicUrl}/api/v1/media/${imageId}`,
      // maxImageWidth is 200 in config/test.json
      width: 200,
      height: 100,
      alt: l('Porträt', 'Portrait'),
    });

    const en = await request(app).get('/api/v1/portfolio?lang=en').expect(200);
    expect(en.body.about).toMatchObject({
      headline: 'About me',
      facts: ['One', 'Two'],
      image: { id: imageId, alt: 'Portrait' },
    });
    expect(en.body.hero).toEqual({ ...hero, description: 'Hello', mapPlace: 'London' });

    await request(app).get(new URL(full.body.about.image.url).pathname).expect(200);
  });

  it('seeds the missing sections and leaves existing ones alone', async () => {
    const admin = await adminAgent();
    await admin
      .post('/api/v1/portfolio/contact')
      .send({ headline: l('Hallo', 'Hi'), description: l('Schreib mir', 'Write me') })
      .expect(201);

    expect(await seedPortfolio('seed')).toEqual(sectionKeys.filter((key) => key !== 'contact'));
    expect(await seedPortfolio('seed')).toEqual([]);

    const page = await request(app).get('/api/v1/portfolio?lang=de').expect(200);
    expect(page.body.contact.headline).toBe('Hallo');
    expect(page.body.settings.name).toBe('Manuel Braun');
    expect(page.body.projects.items.map((item: { title: string }) => item.title)).toEqual([
      'Kochwelt',
      'DABubble',
      'Join',
      'manuel-braun.net',
    ]);
    expect(page.body.skills.sets).toHaveLength(4);
    expect(page.body.seo.ogImage.url).toMatch(/\/media\//);

    const first = page.body.projects.items[0];
    expect(first.images.length).toBeGreaterThanOrEqual(1);
    expect(first.images[0].url).toMatch(/\/media\//);
    expect(first.description).toMatch(/^<p>/);
  });
});

describe('portfolio projects', () => {
  const unsafe = l(
    '<p>Text<script>alert(1)</script><img src="x" onerror="alert(1)"></p>' +
      '<p><a href="javascript:alert(1)">bad</a> <a href="https://example.com/x">ext</a></p>',
    '<p>Text<script>alert(1)</script><img src="x"></p>' +
      '<p><a href="javascript:alert(1)">bad</a> <a href="https://example.com/x">ext</a></p>',
  );

  const expectSanitized = (html: string) => {
    expect(html).not.toMatch(/<script|<img|alert\(1\)<|javascript:|onerror/i);
    expect(html).toContain('<p>Text');
    expect(html).toMatch(/<a[^>]*>bad<\/a>/);
    expect(html).not.toMatch(/<a[^>]*href=[^>]*>bad/i);
    const external = html.match(/<a [^>]*>ext<\/a>/)?.[0] ?? '';
    expect(external).toContain('href="https://example.com/x"');
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer nofollow"');
  };

  it('keeps the images in the sent order, resolves them and reorders on PATCH', async () => {
    const admin = await adminAgent();
    const ids = [
      await uploadedMediaId(admin),
      await uploadedMediaId(admin),
      await uploadedMediaId(admin),
    ];

    const created = await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project(ids)]))
      .expect(201);
    const images = created.body.projects.items[0].images;
    expect(images).toEqual(
      ids.map((id) => ({
        id,
        url: `${config.publicUrl}/api/v1/media/${id}`,
        width: 200,
        height: 100,
        alt: l(`Bild ${id}`, `Image ${id}`),
      })),
    );

    const order = [ids[2]!, ids[0]!, ids[1]!];
    const patched = await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project(order)] })
      .expect(200);
    expect(patched.body.projects.items[0].images.map((i: { id: string }) => i.id)).toEqual(order);

    const de = await request(app).get('/api/v1/portfolio?lang=de').expect(200);
    expect(de.body.projects.items[0].images.map((i: { alt: string }) => i.alt)).toEqual(
      order.map((id) => `Bild ${id}`),
    );
    expect(de.body.projects.items[0].description).toBe('<p>Hallo</p>');
  });

  it('requires between 1 and the maximum number of images', async () => {
    const admin = await adminAgent();
    const id = await uploadedMediaId(admin);

    await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project([])]))
      .expect(400);
    const tooMany = Array.from({ length: PROJECT_IMAGES_MAX + 1 }, () => id);
    await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project(tooMany)]))
      .expect(400);

    // the maximum itself is fine, the same image may appear more than once
    await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project(tooMany.slice(0, PROJECT_IMAGES_MAX))]))
      .expect(201);
    await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project([])] })
      .expect(400);
  });

  it('sanitizes the description on create and on PATCH', async () => {
    const admin = await adminAgent();
    const id = await uploadedMediaId(admin);

    const created = await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project([id], unsafe)]))
      .expect(201);
    for (const lang of ['de', 'en'] as const) {
      expectSanitized(created.body.projects.items[0].description[lang]);
    }

    await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project([id], l('<p>Neu</p>', '<p>New</p>'))] })
      .expect(200);
    const patched = await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project([id], unsafe)] })
      .expect(200);
    expectSanitized(patched.body.projects.items[0].description.de);

    const page = await request(app).get('/api/v1/portfolio?lang=en').expect(200);
    expectSanitized(page.body.projects.items[0].description);
  });

  it('rejects a description that is empty after sanitizing', async () => {
    const admin = await adminAgent();
    const id = await uploadedMediaId(admin);
    const onlyScript = l('<p>Hallo</p>', '<script>alert(1)</script>');

    const res = await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project([id], onlyScript)]))
      .expect(400);
    expect(res.body.error.message).toBe('The description of project "Kochwelt" is empty');

    await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project([id])]))
      .expect(201);
    await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project([id], l('<script>alert(1)</script>', '<p>Hello</p>'))] })
      .expect(400);
    // tags without text are empty as well
    await admin
      .patch('/api/v1/portfolio/projects')
      .send({ items: [project([id], l('<p> <br></p><p></p>', '<p>Hello</p>'))] })
      .expect(400);
  });

  it('rejects a description that grows over the limit when sanitizing', async () => {
    const admin = await adminAgent();
    const id = await uploadedMediaId(admin);
    // each `&` is stored as `&amp;`, so the request fits the limit but the stored value would not
    const ampersands = '&'.repeat(PROJECT_DESCRIPTION_MAX - 10);

    const res = await admin
      .post('/api/v1/portfolio/projects')
      .send(projectsSection([project([id], l(ampersands, '<p>Hello</p>'))]))
      .expect(400);
    expect(res.body.error.message).toBe(
      `The description of project "Kochwelt" is longer than ${PROJECT_DESCRIPTION_MAX} characters`,
    );
  });
});
