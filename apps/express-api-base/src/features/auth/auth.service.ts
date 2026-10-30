import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { conflict, unauthorized } from '../../shared/errors.js';
import type { SignInInput, SignUpInput } from './auth.schemas.js';
import { users } from './users.table.js';

export const publicUser = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

// Verified when the email is unknown, so both sign-in failures take the same time.
const dummyHash = await argon2.hash('dummy-password');

export async function signUp(input: SignUpInput) {
  const passwordHash = await argon2.hash(input.password);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
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
