import { parse } from '@server/core/validate';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { uploadMedia } from '../media/media.service.js';
import { type SectionKey, sectionInputSchemas, sectionKeys } from './portfolio.schemas.js';
import { createSection, sectionExists } from './portfolio.service.js';

/** Uploads every `{ file, alt }` in the seed content and replaces it by the reference `{ id, alt }`. */
async function uploadImages(value: unknown, dir: string): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map((item) => uploadImages(item, dir)));
  if (typeof value !== 'object' || value === null) return value;

  const object = value as Record<string, unknown>;
  if (typeof object['file'] === 'string') {
    const media = await uploadMedia(await readFile(path.join(dir, object['file'])));
    return { id: media.id, alt: object['alt'] };
  }
  const entries = await Promise.all(
    Object.entries(object).map(async ([key, item]) => [key, await uploadImages(item, dir)]),
  );
  return Object.fromEntries(entries);
}

/**
 * Creates every section that does not exist yet from `<dir>/portfolio.json`; image files are
 * relative to `dir`. Existing sections are left alone, so it is safe to run again.
 */
export async function seedPortfolio(dir: string): Promise<SectionKey[]> {
  const seed = JSON.parse(await readFile(path.join(dir, 'portfolio.json'), 'utf8')) as Record<
    string,
    unknown
  >;

  const created: SectionKey[] = [];
  for (const key of sectionKeys) {
    if (!(key in seed) || (await sectionExists(key))) continue;
    const input = parse(sectionInputSchemas[key], await uploadImages(seed[key], dir));
    await createSection(key, input);
    created.push(key);
  }
  return created;
}
