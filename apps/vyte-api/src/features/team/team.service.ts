import { users } from '@server/auth/users.table';
import { db } from '@server/core/db/db';
import { conflict, notFound } from '@server/core/errors';
import { EVENT_EDITORS_MAX } from '@vyte/contracts/events-limits';
import { and, asc, count, eq, gt, isNull, sql } from 'drizzle-orm';
import { newToken } from '../../shared/token.js';
import { membership, requireOwner, requireUpcoming } from '../events/events.service.js';
import { eventMembers } from '../events/events.table.js';
import { editorInvites } from './team.table.js';

/** How long an editor invite works. */
export const EDITOR_INVITE_DAYS = 7;

const inviteColumns = {
  id: editorInvites.id,
  token: editorInvites.token,
  expiresAt: editorInvites.expiresAt,
  createdAt: editorInvites.createdAt,
};

/** Unused and not expired. */
export const inviteIsOpen = () =>
  and(isNull(editorInvites.usedAt), gt(editorInvites.expiresAt, new Date()));

/** Owner first, then the editors in the order they joined. */
export async function listMembers(userId: string, eventId: string) {
  await membership(userId, eventId);
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: eventMembers.role,
      joinedAt: eventMembers.joinedAt,
    })
    .from(eventMembers)
    .innerJoin(users, eq(users.id, eventMembers.userId))
    .where(eq(eventMembers.eventId, eventId))
    .orderBy(sql`${eventMembers.role} = 'owner' desc`, asc(eventMembers.joinedAt));
}

export async function listInvites(userId: string, eventId: string) {
  const { role } = await membership(userId, eventId);
  requireOwner(role);
  return db
    .select(inviteColumns)
    .from(editorInvites)
    .where(and(eq(editorInvites.eventId, eventId), inviteIsOpen()))
    .orderBy(asc(editorInvites.createdAt));
}

export function createInvite(userId: string, eventId: string) {
  return db.transaction(async (tx) => {
    const { event, role } = await membership(userId, eventId, tx, true);
    requireOwner(role);
    requireUpcoming(event);

    const [open] = await tx
      .select({ value: count() })
      .from(editorInvites)
      .where(and(eq(editorInvites.eventId, eventId), inviteIsOpen()));
    if ((open?.value ?? 0) >= EVENT_EDITORS_MAX) {
      throw conflict(`An event can have at most ${EVENT_EDITORS_MAX} open invites`);
    }

    const expiresAt = new Date(Date.now() + EDITOR_INVITE_DAYS * 24 * 60 * 60 * 1000);
    const [invite] = await tx
      .insert(editorInvites)
      .values({ eventId, token: newToken(), createdBy: userId, expiresAt })
      .returning(inviteColumns);
    return invite!;
  });
}

/** Revokes an unused invite; a used one stays as the record of who joined through it. */
export async function revokeInvite(userId: string, eventId: string, inviteId: string) {
  const { role } = await membership(userId, eventId);
  requireOwner(role);
  const deleted = await db
    .delete(editorInvites)
    .where(
      and(
        eq(editorInvites.id, inviteId),
        eq(editorInvites.eventId, eventId),
        isNull(editorInvites.usedAt),
      ),
    )
    .returning({ id: editorInvites.id });
  if (deleted.length === 0) throw notFound('Invite not found');
}

/**
 * The owner removes an editor, or an editor leaves. Nobody removes the owner: they hand the event
 * over first. Leaving also works once the event is over.
 */
export function removeMember(userId: string, eventId: string, memberId: string) {
  return db.transaction(async (tx) => {
    const { event, role } = await membership(userId, eventId, tx, true);
    const leaving = memberId === userId;
    if (!leaving) {
      requireOwner(role);
      requireUpcoming(event);
    }

    const [target] = await tx
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, memberId)));
    if (!target) throw notFound('Member not found');
    if (target.role === 'owner') throw conflict('The owner cannot leave or be removed');

    await tx
      .delete(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, memberId)));
  });
}

/** The owner makes an editor the owner and becomes an editor, in one step. */
export async function handOver(userId: string, eventId: string, newOwnerId: string) {
  await db.transaction(async (tx) => {
    const { event, role } = await membership(userId, eventId, tx, true);
    requireOwner(role);
    requireUpcoming(event);
    if (newOwnerId === userId) throw conflict('You already own the event');

    const [target] = await tx
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, newOwnerId)))
      .for('update');
    if (!target) throw notFound('Member not found');

    // first the old owner, so the unique index on one owner per event holds at every step
    const demoted = await tx
      .update(eventMembers)
      .set({ role: 'editor' })
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)))
      .returning({ userId: eventMembers.userId });
    const promoted = await tx
      .update(eventMembers)
      .set({ role: 'owner' })
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, newOwnerId)))
      .returning({ userId: eventMembers.userId });
    // never an event without an owner: anything but one row each rolls the hand-over back
    if (demoted.length !== 1 || promoted.length !== 1) throw notFound('Member not found');
  });
  return listMembers(userId, eventId);
}
