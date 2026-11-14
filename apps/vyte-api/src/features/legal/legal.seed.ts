import { logger } from '@server/core/logger';
import { parse } from '@server/core/validate';
import { type LegalPageKey, legalPageInputSchema, legalPageKeys } from '@vyte/contracts/legal';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLegalPageIfMissing, legalPageExists } from './legal.service.js';

/**
 * Creates every legal page that does not exist yet from `<dir>/legal/<page>.<lang>.html`.
 * Existing pages are left alone, also one an admin saves at the same moment, so it is safe to
 * run again and on every start.
 */
export async function seedLegal(dir: string): Promise<LegalPageKey[]> {
  const read = (key: LegalPageKey, lang: string) =>
    readFile(path.join(dir, 'legal', `${key}.${lang}.html`), 'utf8');

  const created: LegalPageKey[] = [];
  for (const key of legalPageKeys) {
    if (await legalPageExists(key)) continue;
    const input = { de: await read(key, 'de'), en: await read(key, 'en') };
    if (await createLegalPageIfMissing(key, parse(legalPageInputSchema, input))) {
      created.push(key);
    }
  }
  return created;
}

/**
 * `seedLegal()` at the start of the server. A broken seed must not keep the API from starting:
 * the missing pages answer 404 and the admin creates them in the app.
 */
export async function seedLegalOnStart(dir: string): Promise<void> {
  try {
    const created = await seedLegal(dir);
    if (created.length > 0) logger.info(`Created the legal pages ${created.join(', ')}`);
  } catch (error) {
    logger.error({ err: error }, 'Could not create the missing legal pages from the seed');
  }
}
