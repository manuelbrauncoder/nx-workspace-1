import { db } from '@server/core/db/db';
import { notFound } from '@server/core/errors';
import { imagePath, previewImage } from '@server/core/images';
import type { SaveTheDateSettingsInput } from '@vyte/contracts/events';
import { PREVIEW_IMAGE } from '@vyte/contracts/preview-image';
import { and, eq } from 'drizzle-orm';
import { newToken } from '../../shared/token.js';
import { calendarFile } from '../events/events.calendar.js';
import { getEvent, membership, requireUpcoming } from '../events/events.service.js';
import { eventImages, events } from '../events/events.table.js';
import { isPast } from '../events/events.time.js';

/** An unknown, renewed or turned-off link answers this same 404. */
const notFoundLink = () => notFound('Save the date not found');

/** Turns save the date on (a new link if there is none) or changes its note. */
export async function enableSaveTheDate(
  userId: string,
  eventId: string,
  input: SaveTheDateSettingsInput,
) {
  await db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);
    await tx
      .update(events)
      .set({
        saveTheDateToken: event.saveTheDateToken ?? newToken(),
        saveTheDateNote: input.note,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));
  });
  return getEvent(userId, eventId);
}

/**
 * Turns it off: the link answers 404 and the note goes with it. Also after the event, so a link
 * that went somewhere unwanted can still be stopped.
 */
export async function disableSaveTheDate(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    await membership(userId, eventId, tx, true);
    await tx
      .update(events)
      .set({ saveTheDateToken: null, saveTheDateNote: null, updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
  return getEvent(userId, eventId);
}

/** A new link; the old one answers 404. Only while save the date is on. */
export async function renewSaveTheDateToken(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUpcoming(event);
    if (!event.saveTheDateToken) throw notFound('Save the date is off');
    await tx
      .update(events)
      .set({ saveTheDateToken: newToken(), updatedAt: new Date() })
      .where(eq(events.id, eventId));
  });
  return getEvent(userId, eventId);
}

async function eventOfLink(token: string) {
  const [event] = await db.select().from(events).where(eq(events.saveTheDateToken, token));
  if (!event) throw notFoundLink();
  return event;
}

async function coverOf(eventId: string) {
  const [cover] = await db
    .select({
      filename: eventImages.filename,
      width: eventImages.width,
      height: eventImages.height,
    })
    .from(eventImages)
    .where(and(eq(eventImages.eventId, eventId), eq(eventImages.position, 0)));
  return cover;
}

/** What anyone with the link sees: date, place name and note, never the address or names. */
export async function getSaveTheDate(token: string) {
  const event = await eventOfLink(token);
  if (isPast(event)) return { past: true as const, title: event.title };

  const cover = await coverOf(event.id);
  return {
    past: false as const,
    title: event.title,
    allDay: event.allDay,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeZone: event.timeZone,
    locationName: event.locationName,
    note: event.saveTheDateNote,
    cover: cover ? { width: cover.width, height: cover.height } : null,
  };
}

/** The cover image; 404 without one and once the event is over. */
export async function getCoverFile(token: string) {
  const event = await eventOfLink(token);
  const cover = isPast(event) ? undefined : await coverOf(event.id);
  if (!cover) throw notFound('Image not found');
  return imagePath(cover.filename);
}

/** The cover as the JPEG preview of the shared link; 404 without one and once the event is over. */
export async function getPreviewImage(token: string) {
  const event = await eventOfLink(token);
  const cover = isPast(event) ? undefined : await coverOf(event.id);
  if (!cover) throw notFound('Image not found');
  return previewImage(cover.filename, PREVIEW_IMAGE);
}

/** The calendar file, with the place name only; 404 once the event is over. */
export async function getSaveTheDateCalendar(token: string) {
  const event = await eventOfLink(token);
  if (isPast(event)) throw notFoundLink();
  return calendarFile({ ...event, location: event.locationName });
}
