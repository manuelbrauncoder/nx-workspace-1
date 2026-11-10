import { removeImages } from '@server/core/images';
import { deleteOwnedEvents } from './events.service.js';

/**
 * When an admin deletes a user, the events they own go first, before the user: the cascade of
 * the user only removes memberships and would leave those events without an owner. Their image
 * files are removed once the user is deleted. Should the deletion of the user fail after this,
 * the events stay deleted and their files stay on disk.
 */
export async function removeEventsOfUser(userId: string) {
  const filenames = await deleteOwnedEvents(userId);
  return () => removeImages(filenames);
}
