/** The files a visitor chose, split into those to upload and those left out, with the reason. */
export interface PickedPhotos {
  accepted: File[];
  /** Not one of the types the backend takes. */
  wrongType: File[];
  /** Beyond the photos the visitor may still add. */
  overLimit: File[];
}

/**
 * Splits chosen files: photos of an allowed type first, in the order chosen, as many as `free`
 * allows. The rest is left out, so nothing is sent that the backend would refuse.
 */
export function pickPhotos(
  files: readonly File[],
  free: number,
  types: readonly string[],
): PickedPhotos {
  const wrongType = files.filter((file) => !types.includes(file.type));
  const photos = files.filter((file) => types.includes(file.type));
  const room = Math.max(0, free);
  return { accepted: photos.slice(0, room), wrongType, overLimit: photos.slice(room) };
}
