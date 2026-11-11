import { db } from '@server/core/db/db';
import { badRequest, conflict, notFound } from '@server/core/errors';
import type {
  CreateGuestInput,
  CreateGuestsBulkInput,
  HostResponseInput,
  UpdateGuestInput,
} from '@vyte/contracts/guests';
import { EVENT_GUESTS_MAX } from '@vyte/contracts/guests-limits';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { newToken } from '../../shared/token.js';
import { type Executor, membership, requireUpcoming } from '../events/events.service.js';
import { requireUploadsNotClosed } from '../photos/photos.service.js';
import { exportFileName, type ExportLanguage, guestsCsv } from './guests.export.js';
import { guests } from './guests.table.js';

const guestColumns = {
  id: guests.id,
  name: guests.name,
  note: guests.note,
  maxCompanions: guests.maxCompanions,
  token: guests.token,
  photoToken: guests.photoToken,
  response: guests.response,
  companions: guests.companions,
  companionsReduced: guests.companionsReduced,
  message: guests.message,
  answeredBy: guests.answeredBy,
  respondedAt: guests.respondedAt,
  createdAt: guests.createdAt,
  updatedAt: guests.updatedAt,
};

const ofEvent = (eventId: string, guestId: string) =>
  and(eq(guests.id, guestId), eq(guests.eventId, eventId));

/**
 * Starts every write: the user is a member, the event is not over, and the event row stays
 * locked until the transaction ends, so limits are counted against a stable list.
 */
async function editableEvent(tx: Executor, userId: string, eventId: string) {
  const { event } = await membership(userId, eventId, tx, true);
  requireUpcoming(event);
  return event;
}

async function requireRoom(tx: Executor, eventId: string, adding: number) {
  const [existing] = await tx
    .select({ value: count() })
    .from(guests)
    .where(eq(guests.eventId, eventId));
  if ((existing?.value ?? 0) + adding > EVENT_GUESTS_MAX) {
    throw conflict(`An event can have at most ${EVENT_GUESTS_MAX} guests`);
  }
}

/** Every guest of the event, by name. Readable also once the event is over. */
export async function listGuests(userId: string, eventId: string) {
  await membership(userId, eventId);
  return db
    .select(guestColumns)
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(sql`lower(${guests.name})`), asc(guests.createdAt));
}

export function addGuest(userId: string, eventId: string, input: CreateGuestInput) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    await requireRoom(tx, eventId, 1);
    const [guest] = await tx
      .insert(guests)
      .values({ ...input, eventId, token: newToken(), photoToken: newToken() })
      .returning(guestColumns);
    return guest!;
  });
}

/** One guest per name of a pasted list, all with the same allowance. */
export function addGuests(userId: string, eventId: string, input: CreateGuestsBulkInput) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    await requireRoom(tx, eventId, input.names.length);
    return tx
      .insert(guests)
      .values(
        input.names.map((name) => ({
          eventId,
          name,
          maxCompanions: input.maxCompanions,
          token: newToken(),
          photoToken: newToken(),
        })),
      )
      .returning(guestColumns);
  });
}

/** The guest locked, so an answer of the guest at the same time waits or comes first. */
async function guestForUpdate(tx: Executor, eventId: string, guestId: string) {
  const [guest] = await tx.select().from(guests).where(ofEvent(eventId, guestId)).for('update');
  if (!guest) throw notFound('Guest not found');
  return guest;
}

/**
 * Name, note and allowance; never the answer. Lowering the allowance below the companions given
 * lowers them too and marks the guest, so the hosts can tell them.
 */
export function updateGuest(
  userId: string,
  eventId: string,
  guestId: string,
  input: UpdateGuestInput,
) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    const guest = await guestForUpdate(tx, eventId, guestId);

    const cut = input.maxCompanions !== undefined && guest.companions > input.maxCompanions;
    const [updated] = await tx
      .update(guests)
      .set({
        ...input,
        ...(cut && { companions: input.maxCompanions, companionsReduced: true }),
        updatedAt: new Date(),
      })
      .where(eq(guests.id, guestId))
      .returning(guestColumns);
    return updated!;
  });
}

/** An answer the guest gave in person. The guest can still change it through the link. */
export function recordResponse(
  userId: string,
  eventId: string,
  guestId: string,
  input: HostResponseInput,
) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    const guest = await guestForUpdate(tx, eventId, guestId);
    const companions = input.response === 'declined' ? 0 : input.companions;
    if (companions > guest.maxCompanions) {
      throw badRequest('Validation failed', [
        { path: 'companions', message: `At most ${guest.maxCompanions} companions` },
      ]);
    }

    const now = new Date();
    const [updated] = await tx
      .update(guests)
      .set({
        response: input.response,
        companions,
        companionsReduced: false,
        answeredBy: 'host',
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(guests.id, guestId))
      .returning(guestColumns);
    return updated!;
  });
}

/** Removing a guest ends their link. */
export function removeGuest(userId: string, eventId: string, guestId: string) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    const deleted = await tx
      .delete(guests)
      .where(ofEvent(eventId, guestId))
      .returning({ id: guests.id });
    if (deleted.length === 0) throw notFound('Guest not found');
  });
}

/** A new personal link; the old one answers 404 from now on. */
export function renewToken(userId: string, eventId: string, guestId: string) {
  return db.transaction(async (tx) => {
    await editableEvent(tx, userId, eventId);
    const [updated] = await tx
      .update(guests)
      .set({ token: newToken(), updatedAt: new Date() })
      .where(ofEvent(eventId, guestId))
      .returning(guestColumns);
    if (!updated) throw notFound('Guest not found');
    return updated;
  });
}

/**
 * A new photo link for the place card; a printed card with the old one stops working. Also after
 * the event while photos can still come in, so a card that went around can be stopped.
 */
export function renewPhotoToken(userId: string, eventId: string, guestId: string) {
  return db.transaction(async (tx) => {
    const { event } = await membership(userId, eventId, tx, true);
    requireUploadsNotClosed(event);
    const [updated] = await tx
      .update(guests)
      .set({ photoToken: newToken(), updatedAt: new Date() })
      .where(ofEvent(eventId, guestId))
      .returning(guestColumns);
    if (!updated) throw notFound('Guest not found');
    return updated;
  });
}

/** The guest list as a CSV file, by name. Members only, also once the event is over. */
export async function exportGuests(userId: string, eventId: string, language: ExportLanguage) {
  const { event } = await membership(userId, eventId);
  const rows = await db
    .select({
      name: guests.name,
      maxCompanions: guests.maxCompanions,
      response: guests.response,
      companions: guests.companions,
      message: guests.message,
      note: guests.note,
      answeredBy: guests.answeredBy,
      respondedAt: guests.respondedAt,
    })
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(sql`lower(${guests.name})`), asc(guests.createdAt));
  return {
    csv: guestsCsv(rows, { timeZone: event.timeZone, language }),
    fileName: exportFileName(event.title, language),
  };
}
