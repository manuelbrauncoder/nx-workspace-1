/** Wire format of an image of a note. The file itself is a separate request. */
export interface NoteImageDto {
  id: string;
  width: number;
  height: number;
  createdAt: string;
}

/** Wire format of a note. Timestamps are ISO 8601 strings. */
export interface NoteDto {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  images: NoteImageDto[];
}

export interface NoteDraftDto {
  title: string;
  description: string;
}

/** The backend wraps a note, the list and uploaded images in an object. */
export interface NoteResponseDto {
  note: NoteDto;
}

export interface NotesResponseDto {
  notes: NoteDto[];
}

export interface NoteImagesResponseDto {
  images: NoteImageDto[];
}
