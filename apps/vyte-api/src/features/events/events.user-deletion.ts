import type { UserDeletionExecutor } from '@server/auth/user-deletion';
import { removeImages } from '@server/core/images';
import { deleteOwnedEvents } from './events.service.js';

/**
 * When an admin deletes a user, the events they own go in the same transaction, before the user:
 * the cascade of the user only removes memberships and would leave those events without an
 * owner. Their image files are removed once the deletion is committed.
 */
export async function removeEventsOfUser(userId: string, tx: UserDeletionExecutor) {
  const filenames = await deleteOwnedEvents(userId, tx);
  return () => removeImages(filenames);
}
