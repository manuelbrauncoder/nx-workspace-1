/** An uploaded image. Sections of the portfolio point to it by its `id`. */
export interface Media {
  id: string;
  /** Public address on the backend. */
  url: string;
  /** Size of the stored file in pixels. The backend stores WebP, at most 2000px wide. */
  width: number;
  height: number;
  createdAt: Date;
}

// The limits of the backend, so the upload can reject a file before sending it.
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];
