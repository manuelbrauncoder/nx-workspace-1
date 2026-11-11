import { hashPassword, insertUser } from '@server/auth/auth.service';
import { users } from '@server/auth/users.table';
import { db } from '@server/core/db/db';
import { conflict, notFound } from '@server/core/errors';
import { EVENT_EDITORS_MAX } from '@vyte/contracts/events-limits';
import type { InviteSignUpInput } from '@vyte/contracts/team';
import { and, count, eq } from 'drizzle-orm';
import type { Executor } from '../events/events.service.js';
import { eventMembers, events } from '../events/events.table.js';
import { isPast } from '../events/events.time.js';
import { inviteIsOpen } from '../team/team.service.js';
import { editorInvites } from '../team/team.table.js';

/** Every unknown, used, expired or revoked link, and one to a past event, answers this 404. */
const notInvited = () => notFound('Invite not found');

/**
 * The open invite of the link with its event. `lock` takes both rows, so two people with the
 * same link, and the count of editors, end up consistent.
 */
async function openInvite(token: string, executor: Executor = db, lock = false) {
  if (lock) {
    // the event first, like every other write, then the invite read again under its own lock
    const [found] = await executor
      .select({ eventId: editorInvites.eventId })
      .from(editorInvites)
      .where(eq(editorInvites.token, token));
    if (!found) throw notInvited();
    await executor
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, found.eventId))
      .for('update');
  }
  const query = executor
    .select({ invite: editorInvites, event: events })
    .from(editorInvites)
    .innerJoin(events, eq(events.id, editorInvites.eventId))
    .where(and(eq(editorInvites.token, token), inviteIsOpen()));
  const [row] = lock ? await query.for('update', { of: editorInvites }) : await query;
  if (!row || isPast(row.event)) throw notInvited();
  return row;
}

/** Title, start and the owner's name, before anyone accepts. */
export async function getPublicInvite(token: string) {
  const { event } = await openInvite(token);
  const [owner] = await db
    .select({ name: users.name })
    .from(eventMembers)
    .innerJoin(users, eq(users.id, eventMembers.userId))
    .where(and(eq(eventMembers.eventId, event.id), eq(eventMembers.role, 'owner')));
  return {
    eventTitle: event.title,
    startsAt: event.startsAt,
    allDay: event.allDay,
    timeZone: event.timeZone,
    ownerName: owner?.name ?? null,
  };
}

async function joinAsEditor(
  tx: Executor,
  invite: typeof editorInvites.$inferSelect,
  userId: string,
) {
  const [editors] = await tx
    .select({ value: count() })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, invite.eventId), eq(eventMembers.role, 'editor')));
  if ((editors?.value ?? 0) >= EVENT_EDITORS_MAX) {
    throw conflict(`An event can have at most ${EVENT_EDITORS_MAX} editors`);
  }

  await tx.insert(eventMembers).values({ eventId: invite.eventId, userId, role: 'editor' });
  await tx
    .update(editorInvites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(eq(editorInvites.id, invite.id));
}

/**
 * Makes the signed-in user an editor and uses up the link. A member opening it just gets the
 * event; the link stays open for the person it was meant for.
 */
export async function acceptInvite(userId: string, token: string) {
  // the editor who used this link opens it again: they land on the event
  const [used] = await db
    .select({ eventId: editorInvites.eventId })
    .from(editorInvites)
    .innerJoin(
      eventMembers,
      and(eq(eventMembers.eventId, editorInvites.eventId), eq(eventMembers.userId, userId)),
    )
    .where(and(eq(editorInvites.token, token), eq(editorInvites.usedBy, userId)));
  if (used) return used.eventId;

  return db.transaction(async (tx) => {
    const { invite } = await openInvite(token, tx, true);
    const [member] = await tx
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, invite.eventId), eq(eventMembers.userId, userId)));
    if (!member) await joinAsEditor(tx, invite, userId);
    return invite.eventId;
  });
}

/**
 * Creates the account of someone without one and makes them an editor, while sign-up is closed:
 * the link is the permission. A taken email is a 409 and leaves the link open.
 */
export async function signUpWithInvite(token: string, input: InviteSignUpInput) {
  // a bad link costs no hashing; the check inside the transaction stays the binding one
  await openInvite(token);
  // before the transaction, so the locks are not held while hashing
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const { invite } = await openInvite(token, tx, true);
    const user = await insertUser({ email: input.email, name: input.name, passwordHash }, tx);
    await joinAsEditor(tx, invite, user.id);
    return { userId: user.id, eventId: invite.eventId };
  });
}
