import { users } from '@server/auth/users.table';
import { db } from '@server/core/db/db';
import { badRequest, conflict, notFound } from '@server/core/errors';
import { imagePath } from '@server/core/images';
import type { RsvpInput } from '@vyte/contracts/guests';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { eventImages, eventMembers, events } from '../events/events.table.js';
import { isPast } from '../events/events.time.js';
import { guests } from '../guests/guests.table.js';

type EventRow = typeof events.$inferSelect;
type GuestRow = typeof guests.$inferSelect;

/** Every unknown, renewed or removed link answers this same 404. */
const notInvited = () => notFound('Invitation not found');

/** Answers are open until the deadline, or until the start without one, and never after. */
export function answersOpen(event: EventRow, now = new Date()): boolean {
  return !isPast(event, now) && now < (event.rsvpDeadline ?? event.startsAt);
}

async function invitationOf(token: string, lock = false, executor: Pick<typeof db, 'select'> = db) {
  const query = executor
    .select({ guest: guests, event: events })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .where(eq(guests.token, token));
  const [row] = lock ? await query.for('update', { of: guests }) : await query;
  if (!row) throw notInvited();
  return row;
}

/** Names of owner and editors who set one, the owner first; never an email. */
async function hostNames(eventId: string) {
  const rows = await db
    .select({ name: users.name })
    .from(eventMembers)
    .innerJoin(users, eq(users.id, eventMembers.userId))
    .where(and(eq(eventMembers.eventId, eventId), isNotNull(users.name)))
    .orderBy(sql`${eventMembers.role} = 'owner' desc`, asc(eventMembers.joinedAt));
  return rows.map((row) => row.name!);
}

async function toInvitation(guest: GuestRow, event: EventRow) {
  // after the event a link shows only the title (docs/vyte/spec.md section 4, guest page)
  if (isPast(event)) return { past: true as const, event: { title: event.title } };

  const [images, hosts] = await Promise.all([
    db
      .select({
        id: eventImages.id,
        width: eventImages.width,
        height: eventImages.height,
        position: eventImages.position,
      })
      .from(eventImages)
      .where(eq(eventImages.eventId, event.id))
      .orderBy(asc(eventImages.position)),
    hostNames(event.id),
  ]);

  return {
    past: false as const,
    open: answersOpen(event),
    event: {
      title: event.title,
      description: event.description,
      locationName: event.locationName,
      address: event.address,
      allDay: event.allDay,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timeZone: event.timeZone,
      rsvpDeadline: event.rsvpDeadline,
      images,
      hosts,
    },
    guest: {
      name: guest.name,
      maxCompanions: guest.maxCompanions,
      response: guest.response,
      companions: guest.companions,
      message: guest.message,
      respondedAt: guest.respondedAt,
    },
  };
}

export async function getInvitation(token: string) {
  const { guest, event } = await invitationOf(token);
  return toInvitation(guest, event);
}

/** The guest's own answer, with their row locked, so two answers at once end as one of them. */
export async function answer(token: string, input: RsvpInput) {
  const { guest, event } = await db.transaction(async (tx) => {
    const row = await invitationOf(token, true, tx);
    if (!answersOpen(row.event)) throw conflict('Answers are closed');

    const companions = input.response === 'declined' ? 0 : input.companions;
    if (companions > row.guest.maxCompanions) {
      throw badRequest('Validation failed', [
        { path: 'companions', message: `At most ${row.guest.maxCompanions} companions` },
      ]);
    }

    const now = new Date();
    const [updated] = await tx
      .update(guests)
      .set({
        response: input.response,
        companions,
        companionsReduced: false,
        message: input.message,
        answeredBy: 'guest',
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(guests.id, row.guest.id))
      .returning();
    return { guest: updated!, event: row.event };
  });
  return toInvitation(guest, event);
}

/** An image of the event, so the guest page needs no session; gone once the event is over. */
export async function getImageFile(token: string, imageId: string) {
  const { event } = await invitationOf(token);
  if (isPast(event)) throw notFound('Image not found');

  const [image] = await db
    .select({ filename: eventImages.filename })
    .from(eventImages)
    .where(and(eq(eventImages.id, imageId), eq(eventImages.eventId, event.id)));
  if (!image) throw notFound('Image not found');
  return imagePath(image.filename);
}
