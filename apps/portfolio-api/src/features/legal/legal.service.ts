import { type LegalPageKey, type LegalPageUpdate, legalPageKeys } from '@portfolio/contracts/legal';
import type { Language } from '@portfolio/contracts/portfolio';
import { db } from '@server/core/db/db';
import { notFound } from '@server/core/errors';
import { eq, sql } from 'drizzle-orm';
import { sanitizeLegalHtml } from './legal.sanitize.js';
import { legalPages } from './legal.table.js';

const toPage = (row: typeof legalPages.$inferSelect) => ({ ...row.html, updatedAt: row.updatedAt });

/** The HTML fragment of one page in one language. */
export async function getLegalHtml(key: LegalPageKey, lang: Language) {
  const [row] = await db
    .select({ html: legalPages.html })
    .from(legalPages)
    .where(eq(legalPages.key, key));
  if (!row) throw notFound(`The ${key} page does not exist yet`);
  return row.html[lang];
}

/** Every page in both languages, for the editor. Pages that were not created yet are null. */
export async function listLegalPages() {
  const rows = await db.select().from(legalPages);
  const pages: Record<string, ReturnType<typeof toPage> | null> = Object.fromEntries(
    legalPageKeys.map((key) => [key, null]),
  );
  for (const row of rows) pages[row.key] = toPage(row);
  return pages;
}

export async function legalPageExists(key: LegalPageKey) {
  const [row] = await db
    .select({ key: legalPages.key })
    .from(legalPages)
    .where(eq(legalPages.key, key));
  return row !== undefined;
}

const sanitized = (html?: string) => (html === undefined ? undefined : sanitizeLegalHtml(html));

/**
 * Changes the sent languages of a page; the HTML is sanitized before it is stored. With both
 * languages a missing page is created, with one the page has to exist already.
 */
export async function updateLegalPage(key: LegalPageKey, patch: LegalPageUpdate) {
  const de = sanitized(patch.de);
  const en = sanitized(patch.en);

  if (de !== undefined && en !== undefined) {
    const html = { de, en };
    const [row] = await db
      .insert(legalPages)
      .values({ key, html })
      .onConflictDoUpdate({ target: legalPages.key, set: { html, updatedAt: new Date() } })
      .returning();
    return toPage(row!);
  }

  const [row] = await db
    .update(legalPages)
    // `||` keeps the language that was not sent
    .set({
      html: sql`${legalPages.html} || ${JSON.stringify({ de, en })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(legalPages.key, key))
    .returning();
  if (!row) throw notFound(`The ${key} page does not exist yet, send both languages to create it`);
  return toPage(row);
}
