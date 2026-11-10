import { config, type Config } from '@server/core/config';
import { db } from '@server/core/db/db';
import { logger } from '@server/core/logger';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { adminPasswordProblem, placeholderPasswords } from './admin.password';
import { revokeSessions } from './auth.session';
import { users } from './users.table';

interface Admin {
  id: string;
  email: string;
  passwordHash: string;
}

function refuseToStart(message: string): never {
  logger.fatal(message);
  process.exit(1);
}

async function hasPlaceholderPassword(admin: Admin): Promise<boolean> {
  for (const placeholder of placeholderPasswords) {
    if (await argon2.verify(admin.passwordHash, placeholder)) return true;
  }
  return false;
}

/**
 * An admin created before the production check may still have a committed placeholder as
 * password. Gives them the configured password instead and signs out their sessions, or ends the
 * process if the configured password is not strong either. There is no other way to change it.
 */
async function replacePlaceholderPasswords(admins: Admin[], password: string) {
  for (const admin of admins) {
    if (!(await hasPlaceholderPassword(admin))) continue;

    const problem = adminPasswordProblem(password, 'production');
    if (problem) {
      refuseToStart(
        `The admin user ${admin.email} still has a placeholder password, and ${problem}. Set a strong admin.password and start again: it becomes the password of this admin`,
      );
    }
    const passwordHash = await argon2.hash(password);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, admin.id));
      await revokeSessions(admin.id, tx);
    });
    logger.warn(
      `The admin user ${admin.email} had a placeholder password. It is now admin.password, all sessions are signed out`,
    );
  }
}

/**
 * Creates the first admin from config.admin. Runs at every start and does nothing once an
 * admin exists, so changing the configured password later does not change the account.
 *
 * In production it ends the process instead of creating the admin from a placeholder or short
 * password, because the committed example values would become the password of the account. An
 * existing admin whose password is still a placeholder gets the configured password instead.
 */
export async function seedAdmin(settings: Pick<Config, 'admin' | 'nodeEnv'> = config) {
  const { email, password } = settings.admin;
  const admins = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.role, 'admin'));

  if (admins.length > 0) {
    if (settings.nodeEnv === 'production') await replacePlaceholderPasswords(admins, password);
    return;
  }

  const problem = adminPasswordProblem(password, settings.nodeEnv);
  if (problem) refuseToStart(`Refusing to create the admin user ${email}: ${problem}`);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash: await argon2.hash(password), role: 'admin' })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });

  if (created) logger.info(`Created the admin user ${email}`);
  // an existing account is not promoted: whoever registered it may not be the operator
  else logger.warn(`No admin exists, but ${email} is already registered as a normal user`);
}
