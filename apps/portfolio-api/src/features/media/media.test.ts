import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { adminAgent, app, pngImage, signedUpAgent, uploadedMediaId } from '../../test/helpers.js';

const about = (imageId: string) => ({
  headline: { de: 'Über mich', en: 'About me' },
  description: { de: 'Text', en: 'Text' },
  facts: { de: [], en: [] },
  image: { id: imageId, alt: { de: 'Porträt', en: 'Portrait' } },
});

describe('media', () => {
  it('allows uploads and the list to admins only', async () => {
    await request(app).get('/api/v1/media').expect(401);
    await request(app)
      .post('/api/v1/media')
      .attach('file', await pngImage(), 'a.png')
      .expect(401);

    const user = await signedUpAgent('ada@example.com');
    await user.get('/api/v1/media').expect(403);
    await user
      .post('/api/v1/media')
      .attach('file', await pngImage(), 'a.png')
      .expect(403);
  });

  it('stores uploads as resized WebP and serves them publicly', async () => {
    const admin = await adminAgent();
    const upload = await admin
      .post('/api/v1/media')
      .attach('file', await pngImage(400, 200), 'a.png')
      .expect(201);
    const { id } = upload.body.media;
    // maxImageWidth is 200 in config/test.json
    expect(upload.body.media).toMatchObject({
      width: 200,
      height: 100,
      url: `${config.publicUrl}/api/v1/media/${id}`,
    });

    const file = await request(app).get(`/api/v1/media/${id}`).expect(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await sharp(file.body).metadata()).format).toBe('webp');

    const list = await admin.get('/api/v1/media').expect(200);
    expect(list.body.media).toEqual([upload.body.media]);
  });

  it('rejects missing, invalid and too large files', async () => {
    const admin = await adminAgent();
    await admin.post('/api/v1/media').expect(400);
    await admin
      .post('/api/v1/media')
      .attach('file', Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), 'fake.png')
      .expect(400);
    // maxFileSizeMb is 1 in config/test.json
    await admin
      .post('/api/v1/media')
      .attach('file', Buffer.alloc(1024 * 1024 + 1), 'big.png')
      .expect(413);

    expect(await readdir(config.uploads.dir)).toHaveLength(0);
  });

  // Encoding the 64-megapixel image alone takes a few seconds, on a busy CI runner more than the
  // default 5 seconds of a test.
  it('rejects an image with too many pixels, however small the file', async () => {
    const admin = await adminAgent();
    // 64 megapixels of one color compress to a few hundred kilobytes
    await admin
      .post('/api/v1/media')
      .attach('file', await pngImage(8000, 8000), 'huge.png')
      .expect(400);

    expect(await readdir(config.uploads.dir)).toHaveLength(0);
  }, 30_000);

  it('refuses to delete an image the portfolio still uses', async () => {
    const admin = await adminAgent();
    const first = await uploadedMediaId(admin);
    const second = await uploadedMediaId(admin);
    await admin.post('/api/v1/portfolio/about').send(about(first)).expect(201);

    const refused = await admin.delete(`/api/v1/media/${first}`).expect(409);
    expect(refused.body.error.message).toContain('about');

    await admin
      .patch('/api/v1/portfolio/about')
      .send({ image: about(second).image })
      .expect(200);
    await admin.delete(`/api/v1/media/${first}`).expect(204);
    await request(app).get(`/api/v1/media/${first}`).expect(404);
    expect(await readdir(config.uploads.dir)).toHaveLength(1);

    await admin.delete(`/api/v1/media/${first}`).expect(404);
    await (await signedUpAgent('ada@example.com')).delete(`/api/v1/media/${second}`).expect(403);
  });

  it('refuses to delete an image used as a later image of a project', async () => {
    const admin = await adminAgent();
    const cover = await uploadedMediaId(admin);
    const second = await uploadedMediaId(admin);
    await admin
      .post('/api/v1/portfolio/projects')
      .send({
        headline: { de: 'Projekte', en: 'Projects' },
        description: { de: 'Arbeit', en: 'Work' },
        items: [
          {
            title: 'Kochwelt',
            description: { de: '<p>Hallo</p>', en: '<p>Hello</p>' },
            stack: [],
            images: [cover, second].map((id) => ({ id, alt: { de: 'Bild', en: 'Image' } })),
          },
        ],
      })
      .expect(201);

    const refused = await admin.delete(`/api/v1/media/${second}`).expect(409);
    expect(refused.body.error.message).toContain('projects');
    await request(app).get(`/api/v1/media/${second}`).expect(200);
  });
});
