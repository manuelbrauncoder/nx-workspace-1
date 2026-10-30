import * as helpers from '@server/auth/testing/helpers';
import sharp from 'sharp';
import request from 'supertest';
import { createApp } from '../app.js';
import { apiPrefix } from '../shared/api.js';

export const app = createApp();

export const signedUpAgent = (email: string) => helpers.signedUpAgent(app, email, apiPrefix);
export const adminAgent = () => helpers.adminAgent(app, apiPrefix);

/** A red PNG of the given size, for upload tests. */
export function pngImage(width = 400, height = 200) {
  return sharp({ create: { width, height, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
}

/** Uploads an image as the given admin agent and returns its media id. */
export async function uploadedMediaId(admin: ReturnType<typeof request.agent>) {
  const res = await admin
    .post('/api/v1/media')
    .attach('file', await pngImage(), 'image.png')
    .expect(201);
  return res.body.media.id as string;
}
