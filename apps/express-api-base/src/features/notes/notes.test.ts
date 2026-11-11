import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { app, signedUpAgent } from '../../test/helpers.js';

function png(width = 400, height = 200) {
  return sharp({ create: { width, height, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
}

describe('notes', () => {
  it('requires a session', async () => {
    await request(app).get('/notes').expect(401);
  });

  it('creates, reads, updates and deletes a note', async () => {
    const agent = await signedUpAgent('ada@example.com');

    const created = await agent
      .post('/notes')
      .send({ title: ' First ', description: '<p>Hello</p>' })
      .expect(201);
    const { id } = created.body.note;
    expect(created.body.note).toMatchObject({
      title: 'First',
      description: '<p>Hello</p>',
      images: [],
    });

    const list = await agent.get('/notes').expect(200);
    expect(list.body.notes).toHaveLength(1);

    const updated = await agent.patch(`/notes/${id}`).send({ title: 'Renamed' }).expect(200);
    expect(updated.body.note).toMatchObject({ title: 'Renamed', description: '<p>Hello</p>' });

    await agent.delete(`/notes/${id}`).expect(204);
    await agent.get(`/notes/${id}`).expect(404);
  });

  it('sanitizes the description', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const res = await agent
      .post('/notes')
      .send({
        title: 'XSS',
        description:
          '<p onclick="steal()">Hi</p><script>alert(1)</script>' +
          '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>' +
          '<a href="//evil.example">host</a><a href="/notes">path</a>' +
          '<img src="x" onerror="alert(1)">',
      })
      .expect(201);

    expect(res.body.note.description).toBe(
      '<p>Hi</p><a>bad</a>' +
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">good</a>' +
        '<a>host</a><a>path</a>',
    );
  });

  it('validates input', async () => {
    const agent = await signedUpAgent('ada@example.com');
    await agent.post('/notes').send({ title: '' }).expect(400);
    await agent.get('/notes/not-a-uuid').expect(400);

    const created = await agent.post('/notes').send({ title: 'Note' }).expect(201);
    await agent.patch(`/notes/${created.body.note.id}`).send({}).expect(400);
  });

  it('hides notes and images of other users', async () => {
    const ada = await signedUpAgent('ada@example.com');
    const bob = await signedUpAgent('bob@example.com');

    const created = await ada.post('/notes').send({ title: 'Private' }).expect(201);
    const { id } = created.body.note;
    const upload = await ada.post(`/notes/${id}/images`).attach('images', await png(), 'a.png');
    const imageId = upload.body.images[0].id;

    expect((await bob.get('/notes').expect(200)).body.notes).toEqual([]);
    await bob.get(`/notes/${id}`).expect(404);
    await bob.patch(`/notes/${id}`).send({ title: 'Hacked' }).expect(404);
    await bob.delete(`/notes/${id}`).expect(404);
    await bob
      .post(`/notes/${id}/images`)
      .attach('images', await png(), 'b.png')
      .expect(404);
    await bob.get(`/notes/${id}/images/${imageId}`).expect(404);
    await bob.delete(`/notes/${id}/images/${imageId}`).expect(404);

    await ada.get(`/notes/${id}`).expect(200);
    await ada.get(`/notes/${id}/images/${imageId}`).expect(200);
  });

  it('stores uploads as resized WebP and removes the files with the note', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const { id } = (await agent.post('/notes').send({ title: 'Pics' }).expect(201)).body.note;

    const upload = await agent
      .post(`/notes/${id}/images`)
      .attach('images', await png(400, 200), 'one.png')
      .attach('images', await png(100, 100), 'two.png')
      .expect(201);
    expect(upload.body.images).toHaveLength(2);
    // maxImageWidth is 200 in config/test.json; smaller images are not enlarged
    expect(upload.body.images[0]).toMatchObject({ width: 200, height: 100 });
    expect(upload.body.images[1]).toMatchObject({ width: 100, height: 100 });

    const [first, second] = upload.body.images;
    const file = await agent.get(`/notes/${id}/images/${first.id}`).expect(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect((await sharp(file.body).metadata()).format).toBe('webp');

    const note = await agent.get(`/notes/${id}`).expect(200);
    expect(note.body.note.images).toHaveLength(2);
    expect(await readdir(config.uploads.dir)).toHaveLength(2);

    await agent.delete(`/notes/${id}/images/${second.id}`).expect(204);
    expect(await readdir(config.uploads.dir)).toHaveLength(1);

    await agent.delete(`/notes/${id}`).expect(204);
    expect(await readdir(config.uploads.dir)).toHaveLength(0);
  });

  it('rejects the whole upload if one file is not an image', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const { id } = (await agent.post('/notes').send({ title: 'Pics' }).expect(201)).body.note;

    await agent
      .post(`/notes/${id}/images`)
      .attach('images', await png(), 'ok.png')
      .attach('images', Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect((await agent.get(`/notes/${id}`)).body.note.images).toEqual([]);
    expect(await readdir(config.uploads.dir)).toHaveLength(0);
  });

  it('enforces the upload limits', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const { id } = (await agent.post('/notes').send({ title: 'Pics' }).expect(201)).body.note;

    await agent.post(`/notes/${id}/images`).expect(400);

    // maxFileSizeMb is 1 in config/test.json
    await agent
      .post(`/notes/${id}/images`)
      .attach('images', Buffer.alloc(1024 * 1024 + 1), 'big.png')
      .expect(413);

    // maxImagesPerNote is 3
    await agent
      .post(`/notes/${id}/images`)
      .attach('images', await png(), '1.png')
      .attach('images', await png(), '2.png')
      .expect(201);
    await agent
      .post(`/notes/${id}/images`)
      .attach('images', await png(), '3.png')
      .attach('images', await png(), '4.png')
      .expect(400);
  });
});
