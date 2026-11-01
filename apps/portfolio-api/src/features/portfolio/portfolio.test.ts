import { sectionKeys } from '@portfolio/contracts/portfolio';
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
  });
});
