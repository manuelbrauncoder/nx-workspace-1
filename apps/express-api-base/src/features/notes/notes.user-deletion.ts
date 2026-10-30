import { removeImages } from '@server/core/images';
import { imageFilenamesOfUser } from './notes.service.js';

/**
 * When an admin deletes a user, the database cascade removes the notes and image rows. The image
 * files are collected before and removed after the deletion.
 */
export async function removeNoteImagesOfUser(userId: string) {
  const filenames = await imageFilenamesOfUser(userId);
  return () => removeImages(filenames);
}
