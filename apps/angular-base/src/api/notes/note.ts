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

// The limits of the API, so a form can report them before sending.
export {
  NOTE_DESCRIPTION_MAX_LENGTH,
  NOTE_IMAGE_TYPES,
  NOTE_TITLE_MAX_LENGTH,
} from '@contracts/notes-limits';
/** Set in the runtime config of the API, these are its defaults. */
export const NOTE_IMAGES_MAX = 10;
export const NOTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
