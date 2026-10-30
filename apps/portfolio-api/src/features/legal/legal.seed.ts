import { type LegalPageKey, legalPageInputSchema, legalPageKeys } from '@portfolio/contracts/legal';
import { parse } from '@server/core/validate';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { legalPageExists, updateLegalPage } from './legal.service.js';

/**
 * Creates every legal page that does not exist yet from `<dir>/legal/<page>.<lang>.html`.
 * Existing pages are left alone, so it is safe to run again.
 */
export async function seedLegal(dir: string): Promise<LegalPageKey[]> {
  const read = (key: LegalPageKey, lang: string) =>
    readFile(path.join(dir, 'legal', `${key}.${lang}.html`), 'utf8');

  const created: LegalPageKey[] = [];
  for (const key of legalPageKeys) {
    if (await legalPageExists(key)) continue;
    const input = { de: await read(key, 'de'), en: await read(key, 'en') };
    await updateLegalPage(key, parse(legalPageInputSchema, input));
    created.push(key);
  }
  return created;
}
