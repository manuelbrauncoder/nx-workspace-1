import { db } from '@server/core/db/db';
import { conflict, notFound } from '@server/core/errors';
import { imagePath, processImage, removeImages, saveImage } from '@server/core/images';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { stat } from 'node:fs/promises';
import type { Writable } from 'node:stream';
import { config } from '../../config/index.js';
import { newToken } from '../../shared/token.js';
import { writeZip } from '../../shared/zip.js';
import { type Executor, membership, requireUpcoming } from '../events/events.service.js';
import { events } from '../events/events.table.js';
import { eventEnd } from '../events/events.time.js';
import { guests } from '../guests/guests.table.js';
import { eventPhotos } from './photos.table.js';

type EventRow = typeof events.$inferSelect;

/** Who uploads: a guest through their photo link, or a device at the stand. */
export type Uploader =
  | { kind: 'guest'; event: EventRow; guestId: string; guestName: string }
  | { kind: 'stand'; event: EventRow; deviceId: string | null };

/** Every unknown, renewed or turned-off link answers this same 404. */
const notFoundLink = () => notFound('Upload not found');

/** Uploads are open from the start of the event until some days after its end. */
export function uploadWindow(event: EventRow) {
  const opensAt = event.startsAt;
  const closesAt = new Date(
    eventEnd(event).getTime() + config.photos.uploadDaysAfterEnd * 24 * 60 * 60 * 1000,
  );
  return { opensAt, closesAt };
}

export function isOpen(event: EventRow, now = new Date()) {
  const { opensAt, closesAt } = uploadWindow(event);
  return now >= opensAt && now < closesAt;
}

export async function guestUploader(token: string, executor: Executor = db): Promise<Uploader> {
  const [row] = await executor
    .select({ event: events, guestId: guests.id, guestName: guests.name })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .where(eq(guests.photoToken, token));
  if (!row) throw notFoundLink();
  return { kind: 'guest', ...row };
}

export async function standUploader(
  token: string,
  deviceId: string | null,
  executor: Executor = db,
): Promise<Uploader> {
  const [event] = await executor.select().from(events).where(eq(events.photoStandToken, token));
  if (!event) throw notFoundLink();
  return { kind: 'stand', event, deviceId };
}

/** The photos that count against the uploader's limit and that they see and may delete. */
function ownPhotos(uploader: Uploader): SQL {
  const ofEvent = eq(eventPhotos.eventId, uploader.event.id);
  if (uploader.kind === 'guest') return and(ofEvent, eq(eventPhotos.guestId, uploader.guestId))!;
  // a device without its cookie yet owns nothing; `source` keeps it apart from photo links
  return and(
    ofEvent,
    eq(eventPhotos.source, 'stand'),
    eq(eventPhotos.deviceId, uploader.deviceId ?? ''),
  )!;
}

const limitOf = (uploader: Uploader) =>
  uploader.kind === 'guest' ? config.photos.maxPerGuest : config.photos.maxPerDevice;

async function countOf(executor: Executor, where: SQL) {
  const [row] = await executor.select({ value: count() }).from(eventPhotos).where(where);
  return row?.value ?? 0;
}

/** The upload page: own photos, the limit, what is left and the window. */
export async function uploadView(uploader: Uploader) {
  const photos = await db
    .select({
      id: eventPhotos.id,
      width: eventPhotos.width,
      height: eventPhotos.height,
      createdAt: eventPhotos.createdAt,
    })
    .from(eventPhotos)
    .where(ownPhotos(uploader))
    .orderBy(asc(eventPhotos.createdAt));
  const limit = limitOf(uploader);
  return {
    eventTitle: uploader.event.title,
    guestName: uploader.kind === 'guest' ? uploader.guestName : null,
    photos,
    limit,
    left: Math.max(0, limit - photos.length),
    open: isOpen(uploader.event),
    ...uploadWindow(uploader.event),
  };
}

/** The checks of an upload against what is stored now; run again under the lock. */
async function requireRoom(executor: Executor, uploader: Uploader) {
  if (!isOpen(uploader.event)) throw conflict('Uploads are closed');
  if ((await countOf(executor, ownPhotos(uploader))) >= limitOf(uploader)) {
    throw conflict(`At most ${limitOf(uploader)} photos`);
  }
  if (
    (await countOf(executor, eq(eventPhotos.eventId, uploader.event.id))) >=
    config.photos.maxPerEvent
  ) {
    throw conflict('The event has no room for more photos');
  }
  if (
    uploader.kind === 'stand' &&
    (await countOf(
      executor,
      and(eq(eventPhotos.eventId, uploader.event.id), eq(eventPhotos.source, 'stand'))!,
    )) >= config.photos.maxPerStand
  ) {
    throw conflict('The photo stand has no room for more photos');
  }
}

/** Image processing one or two at a time, so parallel uploads cannot exhaust the memory. */
const PROCESSING_SLOTS = 2;
let processing = 0;
const waiting: (() => void)[] = [];

async function processLimited(upload: Buffer) {
  if (processing >= PROCESSING_SLOTS) await new Promise<void>((resolve) => waiting.push(resolve));
  processing++;
  try {
    const { maxImageWidth } = config.photos;
    // both sides bounded, so a very tall image cannot grow the storage
    return await processImage(upload, { maxWidth: maxImageWidth, maxHeight: maxImageWidth });
  } finally {
    processing--;
    waiting.shift()?.();
  }
}

/** Before multer reads the file, so a closed window or a full limit costs no upload. */
export const assertCanUpload = (uploader: Uploader) => requireRoom(db, uploader);

/**
 * Stores one photo. The image is processed and saved first; then, with the event locked, the
 * link is resolved again and the limits counted, so parallel uploads cannot pass them.
 */
export async function addPhoto(
  resolve: (tx: Executor) => Promise<Uploader>,
  upload: Buffer,
  uploaderName: string | null = null,
) {
  const image = await processLimited(upload);
  const filename = await saveImage(image.data);
  try {
    return await db.transaction(async (tx) => {
      const first = await resolve(tx);
      await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, first.event.id))
        .for('update');
      // read again after the lock: a renewed link or a removed guest ends here
      const uploader = await resolve(tx);
      await requireRoom(tx, uploader);

      await tx.insert(eventPhotos).values({
        eventId: uploader.event.id,
        source: uploader.kind,
        guestId: uploader.kind === 'guest' ? uploader.guestId : null,
        deviceId: uploader.kind === 'stand' ? uploader.deviceId : null,
        uploaderName: uploader.kind === 'guest' ? uploader.guestName : uploaderName,
        filename,
        width: image.width,
        height: image.height,
      });
      return uploader;
    });
  } catch (error) {
    await removeImages([filename]);
    throw error;
  }
}

/** An own photo; 404 for anything else. */
async function ownPhoto(uploader: Uploader, photoId: string) {
  const [photo] = await db
    .select({ id: eventPhotos.id, filename: eventPhotos.filename })
    .from(eventPhotos)
    .where(and(ownPhotos(uploader), eq(eventPhotos.id, photoId)));
  if (!photo) throw notFound('Photo not found');
  return photo;
}

export async function ownPhotoFile(uploader: Uploader, photoId: string) {
  return imagePath((await ownPhoto(uploader, photoId)).filename);
}

/** Deleting an own photo takes something away, so it works outside the window too. */
export async function deleteOwnPhoto(uploader: Uploader, photoId: string) {
  const photo = await ownPhoto(uploader, photoId);
  await db.delete(eventPhotos).where(eq(eventPhotos.id, photo.id));
  await removeImages([photo.filename]);
}

const hostColumns = {
  id: eventPhotos.id,
  source: eventPhotos.source,
  uploaderName: eventPhotos.uploaderName,
  width: eventPhotos.width,
  height: eventPhotos.height,
  hidden: eventPhotos.hidden,
  createdAt: eventPhotos.createdAt,
};

/** All photos of the event for its hosts, newest first; also after the event. */
export async function listPhotos(userId: string, eventId: string) {
  await membership(userId, eventId);
  return db
    .select(hostColumns)
    .from(eventPhotos)
    .where(eq(eventPhotos.eventId, eventId))
    .orderBy(desc(eventPhotos.createdAt), desc(eventPhotos.id));
}

async function photoOfEvent(eventId: string, photoId: string) {
  const [photo] = await db
    .select({ id: eventPhotos.id, filename: eventPhotos.filename })
    .from(eventPhotos)
    .where(and(eq(eventPhotos.id, photoId), eq(eventPhotos.eventId, eventId)));
  if (!photo) throw notFound('Photo not found');
  return photo;
}

export async function photoFile(userId: string, eventId: string, photoId: string) {
  await membership(userId, eventId);
  return imagePath((await photoOfEvent(eventId, photoId)).filename);
}

/** Hides or shows a photo; hidden photos stay out of the ZIP. Also after the event. */
export function setHidden(userId: string, eventId: string, photoId: string, hidden: boolean) {
  return db.transaction(async (tx) => {
    await membership(userId, eventId, tx, true);
    const [photo] = await tx
      .update(eventPhotos)
      .set({ hidden })
      .where(and(eq(eventPhotos.id, photoId), eq(eventPhotos.eventId, eventId)))
      .returning(hostColumns);
    if (!photo) throw notFound('Photo not found');
    return photo;
  });
}

/** Owner and editors delete photos, also after the event. */
export async function deletePhoto(userId: string, eventId: string, photoId: string) {
  const filename = await db.transaction(async (tx) => {
    await membership(userId, eventId, tx, true);
    const [deleted] = await tx
      .delete(eventPhotos)
      .where(and(eq(eventPhotos.id, photoId), eq(eventPhotos.eventId, eventId)))
      .returning({ filename: eventPhotos.filename });
    if (!deleted) throw notFound('Photo not found');
    return deleted.filename;
  });
  await removeImages([filename]);
}

/** A name for the archive: letters and digits of the uploader, else "photo". */
function entryBase(name: string | null) {
  const clean = (name ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean || 'photo';
}

/** The visible photos as a ZIP, named `<uploader>-<n>.webp`. Checks access before writing. */
export async function archiveEntries(userId: string, eventId: string) {
  await membership(userId, eventId);
  const photos = await db
    .select({ filename: eventPhotos.filename, uploaderName: eventPhotos.uploaderName })
    .from(eventPhotos)
    .where(and(eq(eventPhotos.eventId, eventId), eq(eventPhotos.hidden, false)))
    .orderBy(asc(eventPhotos.createdAt), asc(eventPhotos.id));

  const counts = new Map<string, number>();
  const entries = photos.map((photo) => {
    const base = entryBase(photo.uploaderName);
    // counted without case: "Anna-1" and "anna-1" would be one file on macOS and Windows
    const key = base.toLocaleLowerCase();
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return { name: `${base}-${n}.webp`, path: imagePath(photo.filename) };
  });

  // checked before the first byte: a ZIP without ZIP64 ends at 4 GiB
  const sizes = await Promise.all(
    entries.map((entry) =>
      stat(entry.path).then(
        (file) => file.size,
        () => 0,
      ),
    ),
  );
  const total = sizes.reduce(
    (sum, size, index) => sum + size + 76 + 2 * entries[index]!.name.length,
    22,
  );
  if (total > 0xffffffff) throw conflict('Too many photos for one archive');
  return entries;
}

export const writeArchive = (entries: Awaited<ReturnType<typeof archiveEntries>>, out: Writable) =>
  writeZip(entries, out);

/** Turns the photo stand on (a link if there is none); the event must not be over. */
export async function enableStand(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);
    if (event.photoStandToken) return;
    await tx
      .update(events)
      .set({ photoStandToken: newToken(), updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
}

/** Turns it off: the link answers 404. Also after the event; the photos stay. */
export async function disableStand(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    await membership(userId, eventId, tx, true);
    await tx
      .update(events)
      .set({ photoStandToken: null, updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
}

/** Renewing and the like stay possible while photos can still come in, so a leaked link can be stopped. */
export function requireUploadsNotClosed(event: EventRow) {
  if (new Date() >= uploadWindow(event).closesAt) throw conflict('Uploads are closed');
}

/** A new link for the stand; the old one answers 404. Only while it is on. */
export async function renewStand(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUploadsNotClosed(event);
    if (!event.photoStandToken) throw notFound('The photo stand is off');
    await tx
      .update(events)
      .set({ photoStandToken: newToken(), updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
}
