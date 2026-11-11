import type { SignInInput, SignUpInput } from '@contracts/auth';
import { db } from '@server/core/db/db';
import { conflict, unauthorized } from '@server/core/errors';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { users } from './users.table';

export const publicUser = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

// Verified when the email is unknown, so both sign-in failures take the same time.
const dummyHash = await argon2.hash('dummy-password');

export function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function signUp(input: SignUpInput) {
  return insertUser({ ...input, passwordHash: await hashPassword(input.password) });
}

/**
 * Inserts the user with an already hashed password. `executor` lets a caller do it inside its
 * own transaction, with the slow hashing done before the transaction starts.
 */
export async function insertUser(
  input: { email: string; name: string | null; passwordHash: string },
  executor: Pick<typeof db, 'insert'> = db,
) {
  const [user] = await executor
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash: input.passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning(publicUser);

  if (!user) throw conflict('Email is already registered');
  return user;
}

export async function signIn(input: SignInInput) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const valid = await argon2.verify(user?.passwordHash ?? dummyHash, input.password);
  if (!user || !valid) throw unauthorized('Invalid email or password');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function getUser(id: string) {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, id));
  return user;
}
