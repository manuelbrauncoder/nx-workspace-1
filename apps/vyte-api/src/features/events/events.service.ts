import { db } from '@server/core/db/db';
import { badRequest, conflict, forbidden, notFound } from '@server/core/errors';
import {
  imagePath,
  type ProcessedImage,
  processImage,
  removeImages,
  saveImage,
} from '@server/core/images';
import {
  type CreateEventInput,
  eventTimesError,
  type MemberRole,
  type UpdateEventInput,
} from '@vyte/contracts/events';
import { EVENT_IMAGES_MAX } from '@vyte/contracts/events-limits';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { sanitizeEventDescription } from './events.sanitize.js';
import { eventImages, eventMembers, events } from './events.table.js';
import { isPast } from './events.time.js';

type Executor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;
type EventRow = typeof events.$inferSelect;

const imageColumns = {
  id: eventImages.id,
  width: eventImages.width,
  height: eventImages.height,
  position: eventImages.position,
};

/**
 * The role of the user in the event. Every member route starts here, so an event of others
 * behaves like a missing one (404). `lock` takes the event row for the rest of a transaction.
 */
async function membership(userId: string, eventId: string, executor: Executor = db, lock = false) {
  const query = executor
    .select({ event: events, role: eventMembers.role })
    .from(events)
    .innerJoin(eventMembers, eq(eventMembers.eventId, events.id))
    .where(and(eq(events.id, eventId), eq(eventMembers.userId, userId)));
  const [row] = lock ? await query.for('update', { of: events }) : await query;
  if (!row) throw notFound('Event not found');
  return row;
}

function requireOwner(role: MemberRole) {
  if (role !== 'owner') throw forbidden('Only the owner can do this');
}

/** Past events are read-only (docs/vyte/spec.md section 4, "Past events"). */
function requireUpcoming(event: EventRow) {
  if (isPast(event)) throw conflict('The event is over');
}

async function imagesByEvent(eventIds: string[], executor: Executor = db) {
  const byEvent = new Map<string, (typeof rows)[number]['image'][]>();
  if (eventIds.length === 0) return byEvent;

  const rows = await executor
    .select({ eventId: eventImages.eventId, image: imageColumns })
    .from(eventImages)
    .where(inArray(eventImages.eventId, eventIds))
    .orderBy(asc(eventImages.position));
  for (const { eventId, image } of rows) {
    byEvent.set(eventId, [...(byEvent.get(eventId) ?? []), image]);
  }
  return byEvent;
}

function toEvent(
  event: EventRow,
  role: MemberRole,
  images: Awaited<ReturnType<typeof imagesByEvent>>,
) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    address: event.address,
    allDay: event.allDay,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeZone: event.timeZone,
    rsvpDeadline: event.rsvpDeadline,
    role,
    past: isPast(event),
    images: images.get(event.id) ?? [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

/** Upcoming events first, soonest first; then past events, most recent first. */
export async function listEvents(userId: string) {
  const rows = await db
    .select({ event: events, role: eventMembers.role })
    .from(events)
    .innerJoin(eventMembers, eq(eventMembers.eventId, events.id))
    .where(eq(eventMembers.userId, userId))
    .orderBy(asc(events.startsAt));

  const images = await imagesByEvent(rows.map((row) => row.event.id));
  const list = rows.map((row) => toEvent(row.event, row.role, images));
  return [...list.filter((event) => !event.past), ...list.filter((event) => event.past).reverse()];
}

export async function getEvent(userId: string, eventId: string) {
  const { event, role } = await membership(userId, eventId);
  return toEvent(event, role, await imagesByEvent([event.id]));
}

export async function createEvent(userId: string, input: CreateEventInput) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({ ...input, description: sanitizeEventDescription(input.description) })
      .returning();
    await tx.insert(eventMembers).values({ eventId: event!.id, userId, role: 'owner' });
    return toEvent(event!, 'owner', new Map());
  });
}

export async function updateEvent(userId: string, eventId: string, input: UpdateEventInput) {
  return db.transaction(async (tx) => {
    const { event, role } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);

    const merged = { ...event, ...input };
    const error = eventTimesError(merged);
    if (error) throw badRequest('Validation failed', [error]);

    const [updated] = await tx
      .update(events)
      .set({
        ...input,
        description:
          input.description === undefined ? undefined : sanitizeEventDescription(input.description),
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();
    return toEvent(updated!, role, await imagesByEvent([eventId], tx));
  });
}

/** Owner only, also for a past event. Guests, members and image rows go by cascade. */
export async function deleteEvent(userId: string, eventId: string) {
  // locked, so an upload running at the same time either finishes first or finds no event
  const files = await db.transaction(async (tx) => {
    const { role } = await membership(userId, eventId, tx, true);
    requireOwner(role);

    const rows = await tx
      .select({ filename: eventImages.filename })
      .from(eventImages)
      .where(eq(eventImages.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
    return rows;
  });
  await removeImages(files.map((file) => file.filename));
}

/**
 * The checks of a write before its request body is read: a member, and the event not over.
 * Upload routes run it before parsing the files, so others never get to send them.
 */
export async function assertCanEdit(userId: string, eventId: string) {
  const { event } = await membership(userId, eventId);
  requireUpcoming(event);
}

/**
 * Appends images after the existing ones. All-or-nothing: if one file is not a valid image or
 * the limit would be passed, nothing is stored. The count is checked with the event locked, so
 * parallel uploads cannot pass the limit.
 */
export async function addImages(userId: string, eventId: string, uploads: Buffer[]) {
  const { event } = await membership(userId, eventId);
  requireUpcoming(event);
  if (uploads.length === 0) throw badRequest('No files in the "images" field');
  if (uploads.length > EVENT_IMAGES_MAX) {
    throw conflict(`An event can have at most ${EVENT_IMAGES_MAX} images`);
  }

  // one after another, so a request holds only one decoded image in memory at a time
  const processed: ProcessedImage[] = [];
  for (const upload of uploads) processed.push(await processImage(upload));

  const filenames: string[] = [];
  try {
    for (const image of processed) filenames.push(await saveImage(image.data));
    return await db.transaction(async (tx) => {
      const locked = await membership(userId, eventId, tx, true);
      requireUpcoming(locked.event);
      const [existing] = await tx
        .select({ value: count() })
        .from(eventImages)
        .where(eq(eventImages.eventId, eventId));
      const start = existing?.value ?? 0;
      if (start + processed.length > EVENT_IMAGES_MAX) {
        throw conflict(`An event can have at most ${EVENT_IMAGES_MAX} images`);
      }

      await tx.insert(eventImages).values(
        processed.map((image, index) => ({
          eventId,
          filename: filenames[index]!,
          width: image.width,
          height: image.height,
          position: start + index,
        })),
      );
      return (await imagesByEvent([eventId], tx)).get(eventId) ?? [];
    });
  } catch (error) {
    await removeImages(filenames);
    throw error;
  }
}

/**
 * Gives the images the positions 0, 1, … in the order of `ids`. The unique key on (event, position)
 * is checked per row, so the first pass moves every image above the highest position.
 */
async function renumber(tx: Executor, eventId: string, ids: string[]) {
  const offset = EVENT_IMAGES_MAX + ids.length;
  await tx
    .update(eventImages)
    .set({ position: sql`${eventImages.position} + ${offset}` })
    .where(eq(eventImages.eventId, eventId));
  for (const [position, id] of ids.entries()) {
    await tx
      .update(eventImages)
      .set({ position })
      .where(and(eq(eventImages.id, id), eq(eventImages.eventId, eventId)));
  }
}

export async function reorderImages(userId: string, eventId: string, ids: string[]) {
  return db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);

    const current = await tx
      .select({ id: eventImages.id })
      .from(eventImages)
      .where(eq(eventImages.eventId, eventId));
    const known = new Set(current.map((image) => image.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => known.has(id))
    ) {
      throw badRequest('Validation failed', [
        { path: 'ids', message: 'Must list every image of the event exactly once' },
      ]);
    }

    await renumber(tx, eventId, ids);
    return (await imagesByEvent([eventId], tx)).get(eventId) ?? [];
  });
}

export async function deleteImage(userId: string, eventId: string, imageId: string) {
  const filename = await db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);

    const [deleted] = await tx
      .delete(eventImages)
      .where(and(eq(eventImages.id, imageId), eq(eventImages.eventId, eventId)))
      .returning({ filename: eventImages.filename });
    if (!deleted) throw notFound('Image not found');

    const rest = await tx
      .select({ id: eventImages.id })
      .from(eventImages)
      .where(eq(eventImages.eventId, eventId))
      .orderBy(asc(eventImages.position));
    await renumber(
      tx,
      eventId,
      rest.map((image) => image.id),
    );
    return deleted.filename;
  });
  await removeImages([filename]);
  return (await imagesByEvent([eventId])).get(eventId) ?? [];
}

/** Absolute path of the image file, after checking that the user is a member of the event. */
export async function getImageFile(userId: string, eventId: string, imageId: string) {
  await membership(userId, eventId);
  const [image] = await db
    .select({ filename: eventImages.filename })
    .from(eventImages)
    .where(and(eq(eventImages.id, imageId), eq(eventImages.eventId, eventId)));
  if (!image) throw notFound('Image not found');
  return imagePath(image.filename);
}

/**
 * For deleting a user: removes the events they own, with everything that hangs on them, and
 * returns their image files, which go once the user is deleted. Memberships as editor go with
 * the cascade of the user.
 */
export function deleteOwnedEvents(userId: string) {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: events.id })
      .from(events)
      .innerJoin(eventMembers, eq(eventMembers.eventId, events.id))
      .where(and(eq(eventMembers.userId, userId), eq(eventMembers.role, 'owner')))
      .for('update', { of: events });
    const ids = owned.map((row) => row.id);
    if (ids.length === 0) return [];

    const files = await tx
      .select({ filename: eventImages.filename })
      .from(eventImages)
      .where(inArray(eventImages.eventId, ids));
    await tx.delete(events).where(inArray(events.id, ids));
    return files.map((file) => file.filename);
  });
}
