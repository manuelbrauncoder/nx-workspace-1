import type { db } from '@server/core/db/db';

/** The transaction that deletes the user. */
export type UserDeletionExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

/**
 * Runs inside the transaction that deletes the user, before the delete, e.g. to collect the files
 * of the user or to delete rows the cascade does not reach. What it returns runs after the
 * deletion is committed, e.g. to remove those files.
 */
export type UserDeletionHook = (
  userId: string,
  tx: UserDeletionExecutor,
) => Promise<(() => Promise<void>) | void>;

const hooks = new Set<UserDeletionHook>();

/**
 * Lets a feature clean up what the database cascade does not cover when an admin deletes a
 * user. Registering the same function again has no effect. Returns a function that removes the
 * hook again.
 *
 * @example
 * onUserDeleted(async (userId) => {
 *   const filenames = await imageFilenamesOfUser(userId);
 *   return () => removeImages(filenames);
 * });
 */
export function onUserDeleted(hook: UserDeletionHook): () => void {
  hooks.add(hook);
  return () => hooks.delete(hook);
}

/** Runs the hooks inside the deleting transaction and returns what has to run after it. */
export async function prepareUserDeletion(
  userId: string,
  tx: UserDeletionExecutor,
): Promise<() => Promise<void>> {
  // one after another: they share the transaction
  const cleanups: Awaited<ReturnType<UserDeletionHook>>[] = [];
  for (const hook of hooks) cleanups.push(await hook(userId, tx));
  return async () => {
    for (const cleanup of cleanups) await cleanup?.();
  };
}
