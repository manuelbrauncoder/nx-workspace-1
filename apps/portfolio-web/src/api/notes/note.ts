export interface NoteImage {
  id: string;
  /** Address of the file on the backend. It needs the session cookie, an `<img>` sends it. */
  url: string;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  /** Rich text as HTML, `''` when empty. Untrusted, show it with `app-ui-rich-text` only. */
  description: string;
  createdAt: Date;
  updatedAt: Date;
  images: NoteImage[];
}

/** The fields a user can edit, used for both creating and updating a note. */
export interface NoteDraft {
  title: string;
  description: string;
}

// The limits of the backend, so a form can report them before sending.
export const NOTE_TITLE_MAX_LENGTH = 200;
/** Counts the HTML, not the visible text. */
export const NOTE_DESCRIPTION_MAX_LENGTH = 50_000;
export const NOTE_IMAGES_MAX = 10;
export const NOTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const NOTE_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];
