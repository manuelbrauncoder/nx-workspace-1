import type { AcceptAccountInviteInput } from '@contracts/account-invites';
import { db } from '@server/core/db/db';
import { notFound } from '@server/core/errors';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { accountInvites } from './account-invites.table';
import { hashPassword, insertUser } from './auth.service';

/** How long an account link works. */
export const ACCOUNT_INVITE_DAYS = 7;

const adminView = {
  id: accountInvites.id,
  name: accountInvites.name,
  token: accountInvites.token,
  expiresAt: accountInvites.expiresAt,
  createdAt: accountInvites.createdAt,
};

/** Unused and not expired. Every other link answers the same 404, so a probe learns nothing. */
const isOpen = () => and(isNull(accountInvites.usedAt), gt(accountInvites.expiresAt, new Date()));

// Never logged: the request log masks token segments of the URL (`@server/core/logger`).
const newToken = () => randomBytes(32).toString('base64url');

export async function createAccountInvite(actorId: string, name: string) {
  const expiresAt = new Date(Date.now() + ACCOUNT_INVITE_DAYS * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(accountInvites)
    .values({ name, token: newToken(), createdBy: actorId, expiresAt })
    .returning(adminView);
  return invite!;
}

/** Open links, oldest first. */
export function listOpenAccountInvites() {
  return db
    .select(adminView)
    .from(accountInvites)
    .where(isOpen())
    .orderBy(asc(accountInvites.createdAt));
}

/** Revokes an unused link; a used one stays as the record of who created the account. */
export async function revokeAccountInvite(id: string) {
  const deleted = await db
    .delete(accountInvites)
    .where(and(eq(accountInvites.id, id), isNull(accountInvites.usedAt)))
    .returning({ id: accountInvites.id });
  if (deleted.length === 0) throw notFound('Account link not found');
}

export async function getOpenAccountInvite(token: string) {
  const [invite] = await db
    .select({ name: accountInvites.name })
    .from(accountInvites)
    .where(and(eq(accountInvites.token, token), isOpen()));
  if (!invite) throw notFound('Account link not found');
  return invite;
}

/**
 * Creates the account of an open link and marks the link used, in one transaction with the link
 * locked, so two requests with the same link create one account. A taken email is a 409 and
 * leaves the link open.
 */
export async function acceptAccountInvite(token: string, input: AcceptAccountInviteInput) {
  // before the transaction, so the lock and the connection are not held while hashing
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({ id: accountInvites.id, name: accountInvites.name })
      .from(accountInvites)
      .where(and(eq(accountInvites.token, token), isOpen()))
      .for('update');
    if (!invite) throw notFound('Account link not found');

    const user = await insertUser(
      { email: input.email, name: input.name ?? invite.name, passwordHash },
      tx,
    );
    await tx
      .update(accountInvites)
      .set({ usedAt: new Date(), usedBy: user.id })
      .where(eq(accountInvites.id, invite.id));
    return user;
  });
}
