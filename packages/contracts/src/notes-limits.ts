// Plain constants without Zod, so a frontend can import them without bundling Zod.

export const NOTE_TITLE_MAX_LENGTH = 200;
/** Counts the HTML, not the visible text. */
export const NOTE_DESCRIPTION_MAX_LENGTH = 50_000;
/**
 * Image types the API accepts. It checks the bytes, not the declared type, and re-encodes every
 * image to WebP.
 */
export const NOTE_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];
