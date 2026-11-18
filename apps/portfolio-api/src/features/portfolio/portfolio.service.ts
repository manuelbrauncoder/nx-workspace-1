import {
  type Language,
  PROJECT_DESCRIPTION_MAX,
  type SectionContent,
  type SectionKey,
  sectionKeys,
} from '@portfolio/contracts/portfolio';
import { db } from '@server/core/db/db';
import { badRequest, conflict, notFound } from '@server/core/errors';
import { sanitizeRichText } from '@server/core/rich-text';
import { eq, sql } from 'drizzle-orm';
import { type Media, mediaByIds } from '../media/media.service.js';
import { portfolioSections } from './portfolio.table.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Image references `{ id, alt }` are the only objects in the content with an `id`. */
function imageIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(imageIds);
  if (!isObject(value)) return [];
  return typeof value['id'] === 'string' ? [value['id']] : Object.values(value).flatMap(imageIds);
}

/** Replaces each reference `{ id, alt }` by the full image `{ id, url, width, height, alt }`. */
function withImages(value: unknown, media: Map<string, Media>): unknown {
  if (Array.isArray(value)) return value.map((item) => withImages(item, media));
  if (!isObject(value)) return value;
  if (typeof value['id'] === 'string') {
    const image = media.get(value['id']);
    // deleting a referenced image is refused, so this means the data was changed by hand
    if (!image) throw new Error(`Image ${value['id']} of the portfolio content is missing`);
    return {
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
      alt: value['alt'],
    };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, withImages(item, media)]),
  );
}

/** Replaces every `{ de, en }` by the value of one language. */
function localize(value: unknown, lang: Language): unknown {
  if (Array.isArray(value)) return value.map((item) => localize(item, lang));
  if (!isObject(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 2 && 'de' in value && 'en' in value) return value[lang];
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, localize(item, lang)]),
  );
}

interface ProjectInput {
  title: string;
  description: Record<Language, string>;
}

/** Whether sanitized HTML shows no text, e.g. `<p></p>` or `<p> <br></p>`. */
const hasNoText = (html: string) => html.replace(/<[^>]*>/g, '').trim() === '';

/**
 * The rich-text description of a project, reduced to the allowed formats. Sanitizing re-encodes
 * entities (`&` becomes `&amp;`), so the length is checked again on the stored value.
 */
function sanitizeProject(project: ProjectInput): ProjectInput {
  const description = Object.fromEntries(
    Object.entries(project.description).map(([lang, html]) => {
      const clean = sanitizeRichText(html, 'text').trim();
      if (hasNoText(clean)) {
        throw badRequest(`The description of project "${project.title}" is empty`);
      }
      if (clean.length > PROJECT_DESCRIPTION_MAX) {
        throw badRequest(
          `The description of project "${project.title}" is longer than ${PROJECT_DESCRIPTION_MAX} characters`,
        );
      }
      return [lang, clean];
    }),
  ) as Record<Language, string>;
  return { ...project, description };
}

/** Sanitizes the rich text of a section before it is stored. Only projects have rich text. */
function sanitizeContent(key: SectionKey, content: SectionContent): SectionContent {
  if (key !== 'projects' || !Array.isArray(content['items'])) return content;
  return { ...content, items: (content['items'] as ProjectInput[]).map(sanitizeProject) };
}

async function resolveImages(content: SectionContent) {
  return withImages(content, await mediaByIds(imageIds(content)));
}

async function assertImagesExist(content: SectionContent) {
  const ids = [...new Set(imageIds(content))];
  const media = await mediaByIds(ids);
  const unknown = ids.filter((id) => !media.has(id));
  if (unknown.length > 0) throw badRequest(`Unknown image: ${unknown.join(', ')}`);
}

/**
 * The whole start page. Sections that were not created yet are null. Without `lang` the
 * editor gets both languages, with it every localized value is reduced to one.
 */
export async function getPage(lang?: Language) {
  const rows = await db.select().from(portfolioSections);
  const media = await mediaByIds(rows.flatMap((row) => imageIds(row.content)));

  const page: Record<string, unknown> = Object.fromEntries(sectionKeys.map((key) => [key, null]));
  for (const row of rows) page[row.key] = withImages(row.content, media);
  return lang ? localize(page, lang) : page;
}

export async function sectionExists(key: SectionKey) {
  const [row] = await db
    .select({ key: portfolioSections.key })
    .from(portfolioSections)
    .where(eq(portfolioSections.key, key));
  return row !== undefined;
}

export async function createSection(key: SectionKey, content: SectionContent) {
  const input = sanitizeContent(key, content);
  await assertImagesExist(input);

  const [row] = await db
    .insert(portfolioSections)
    .values({ key, content: input })
    .onConflictDoNothing()
    .returning({ content: portfolioSections.content });
  if (!row) throw conflict(`The ${key} section already exists, change it with PATCH`);

  return resolveImages(row.content);
}

/**
 * Changes only the sent fields; arrays and nested objects are replaced as a whole. The merge
 * runs in the database, so two concurrent changes of different fields both survive.
 */
export async function updateSection(key: SectionKey, changes: SectionContent) {
  const patch = sanitizeContent(key, changes);
  await assertImagesExist(patch);

  const [row] = await db
    .update(portfolioSections)
    .set({
      // `||` merges the top-level fields; stripping the nulls removes the cleared ones
      content: sql`jsonb_strip_nulls(${portfolioSections.content} || ${JSON.stringify(patch)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(portfolioSections.key, key))
    .returning({ content: portfolioSections.content });
  if (!row) throw notFound(`The ${key} section does not exist yet, create it with POST`);

  return resolveImages(row.content);
}
