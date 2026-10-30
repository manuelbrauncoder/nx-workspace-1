import { db } from '@server/core/db/db';
import { badRequest, conflict, notFound } from '@server/core/errors';
import { imagePath, processImage, removeImages, saveImage } from '@server/core/images';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { apiPrefix } from '../../shared/api.js';
import { portfolioSections } from '../portfolio/portfolio.table.js';
import { media } from './media.table.js';

const mediaColumns = {
  id: media.id,
  width: media.width,
  height: media.height,
  createdAt: media.createdAt,
};

export const mediaUrl = (id: string) => `${config.publicUrl}${apiPrefix}/media/${id}`;

const withUrl = <T extends { id: string }>(row: T) => ({ ...row, url: mediaUrl(row.id) });

export async function listMedia() {
  const rows = await db.select(mediaColumns).from(media).orderBy(desc(media.createdAt));
  return rows.map(withUrl);
}

export type Media = Awaited<ReturnType<typeof listMedia>>[number];

/** The media rows with these ids, by id. Unknown ids are missing from the map. */
export async function mediaByIds(ids: string[]) {
  const byId = new Map<string, Media>();
  if (ids.length === 0) return byId;

  const rows = await db.select(mediaColumns).from(media).where(inArray(media.id, ids));
  for (const row of rows) byId.set(row.id, withUrl(row));
  return byId;
}

export async function uploadMedia(upload: Buffer | undefined) {
  if (!upload) throw badRequest('No file in the "file" field');
  const image = await processImage(upload);

  const filename = await saveImage(image.data);
  try {
    const [row] = await db
      .insert(media)
      .values({ filename, width: image.width, height: image.height })
      .returning(mediaColumns);
    return withUrl(row!);
  } catch (error) {
    await removeImages([filename]);
    throw error;
  }
}

async function findMedia(id: string) {
  const [row] = await db
    .select({ id: media.id, filename: media.filename })
    .from(media)
    .where(eq(media.id, id));
  if (!row) throw notFound('Image not found');
  return row;
}

export async function getMediaFile(id: string) {
  const row = await findMedia(id);
  return imagePath(row.filename);
}

/**
 * Image references are the only objects with an `id` in the portfolio content. Queried on the
 * table instead of through the portfolio service, which itself depends on this one.
 */
async function isReferenced(id: string) {
  const [row] = await db
    .select({ key: portfolioSections.key })
    .from(portfolioSections)
    .where(
      sql`jsonb_path_exists(${portfolioSections.content}, '$.**.id ? (@ == $id)', ${JSON.stringify({ id })}::jsonb)`,
    )
    .limit(1);
  return row?.key;
}

/** Refuses an image the portfolio still shows, so the page never points to a missing file. */
export async function deleteMedia(id: string) {
  const row = await findMedia(id);
  const section = await isReferenced(id);
  if (section) throw conflict(`The image is used in the ${section} section`);

  await db.delete(media).where(eq(media.id, row.id));
  await removeImages([row.filename]);
}
