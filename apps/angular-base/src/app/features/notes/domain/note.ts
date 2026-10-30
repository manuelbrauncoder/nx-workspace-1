// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export {
  NOTE_DESCRIPTION_MAX_LENGTH,
  NOTE_IMAGES_MAX,
  NOTE_IMAGE_MAX_BYTES,
  NOTE_IMAGE_TYPES,
  NOTE_TITLE_MAX_LENGTH,
} from '@api/notes/note';
export type { Note, NoteDraft, NoteImage } from '@api/notes/note';
