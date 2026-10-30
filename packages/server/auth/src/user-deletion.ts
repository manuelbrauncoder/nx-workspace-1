/**
 * Runs before a user is deleted, e.g. to collect the files of the user. What it returns runs
 * after the deletion is committed, e.g. to remove those files.
 */
export type UserDeletionHook = (userId: string) => Promise<(() => Promise<void>) | void>;

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

/** Runs the hooks before the deletion and returns what has to run after it. */
export async function prepareUserDeletion(userId: string): Promise<() => Promise<void>> {
  const cleanups = await Promise.all([...hooks].map((hook) => hook(userId)));
  return async () => {
    for (const cleanup of cleanups) await cleanup?.();
  };
}
