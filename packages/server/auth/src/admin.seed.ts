import { config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { logger } from '@server/core/logger';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { users } from './users.table';

/**
 * Creates the first admin from config.admin. Runs at every start and does nothing once an
 * admin exists, so changing the configured password later does not change the account.
 */
export async function seedAdmin() {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);
  if (admin) return;

  const { email, password } = config.admin;
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash: await argon2.hash(password), role: 'admin' })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });

  if (created) logger.info(`Created the admin user ${email}`);
  // an existing account is not promoted: whoever registered it may not be the operator
  else logger.warn(`No admin exists, but ${email} is already registered as a normal user`);
}
