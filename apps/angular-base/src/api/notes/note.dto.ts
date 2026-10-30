// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  NoteDraftDto,
  NoteDto,
  NoteImageDto,
  NoteImagesResponseDto,
  NoteResponseDto,
  NotesResponseDto,
} from '@contracts/notes';
