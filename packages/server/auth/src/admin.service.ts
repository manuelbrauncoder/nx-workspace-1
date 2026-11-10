import type { Role } from '@contracts/auth';
import { db } from '@server/core/db/db';
import { conflict, notFound } from '@server/core/errors';
import { asc, eq } from 'drizzle-orm';
import { publicUser } from './auth.service';
import { revokeSessions } from './auth.session';
import { prepareUserDeletion } from './user-deletion';
import { users } from './users.table';

export function listUsers() {
  return db.select(publicUser).from(users).orderBy(asc(users.createdAt));
}

/** Admins cannot change their own role, so at least one admin always remains. */
export async function setRole(actorId: string, userId: string, role: Role) {
  if (userId === actorId) throw conflict('You cannot change your own role');

  const [user] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning(publicUser);
  if (!user) throw notFound('User not found');
  return user;
}

export async function deleteUser(actorId: string, userId: string) {
  if (userId === actorId) throw conflict('You cannot delete your own account');

  // signed out first, so the user cannot create rows while the hooks of the features run
  await revokeSessions(userId);
  const cleanUp = await prepareUserDeletion(userId);

  // rows of features go with the user (cascade); their files are removed afterwards
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    if (deleted.length === 0) throw notFound('User not found');
    await revokeSessions(userId, tx);
  });

  await cleanUp();
}

export async function revokeUserSessions(userId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw notFound('User not found');
  await revokeSessions(userId);
}
