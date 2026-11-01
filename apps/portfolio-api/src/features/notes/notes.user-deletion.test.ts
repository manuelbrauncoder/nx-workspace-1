import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { config } from '../../config/index.js';
import { adminAgent, signedUpAgent } from '../../test/helpers.js';

describe('deleting a user', () => {
  it('removes their notes and image files', async () => {
    const admin = await adminAgent();
    const user = await signedUpAgent('ada@example.com');
    const id = (await user.get('/api/v1/auth/me').expect(200)).body.user.id;

    const note = await user.post('/api/v1/notes').send({ title: 'Note' }).expect(201);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    await user.post(`/api/v1/notes/${note.body.note.id}/images`).attach('images', png, 'a.png');
    expect(await readdir(config.uploads.dir)).toHaveLength(1);

    await admin.delete(`/api/v1/admin/users/${id}`).expect(204);

    expect(await readdir(config.uploads.dir)).toHaveLength(0);

    // the new account with the same email starts empty
    const again = await signedUpAgent('ada@example.com');
    const notes = await again.get('/api/v1/notes').expect(200);
    expect(notes.body.notes).toHaveLength(0);
  });
});
