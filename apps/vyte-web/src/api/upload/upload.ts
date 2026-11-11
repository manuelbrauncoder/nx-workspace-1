/**
 * Which upload page it is: the personal one of a guest (`/photos/<token>`, the QR code of their
 * place card) or the shared one of the photo stand (`/stand/<token>`).
 */
export interface UploadLink {
  kind: 'guest' | 'stand';
  token: string;
}

/** A photo the visitor uploaded themself. Its address comes from `UploadsRepository.photoUrl()`. */
export interface OwnPhoto {
  id: string;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  createdAt: Date;
}

/** What an upload page shows: the visitor's own photos and how many more they may add. */
export interface Upload {
  eventTitle: string;
  /** The guest of the place card. `null` at the stand. */
  guestName: string | null;
  /** At the stand the photos of this device, empty until `registerDevice()` ran. */
  photos: OwnPhoto[];
  /** How many photos this guest or device may upload in total. */
  limit: number;
  /** How many of them are left. The backend sends it with every answer, never count yourself. */
  left: number;
  /** Whether uploads are possible right now, i.e. between `opensAt` and `closesAt`. */
  open: boolean;
  opensAt: Date;
  closesAt: Date;
}

// The limit of the API, so the form of the stand can report it before sending.
export { PHOTO_UPLOADER_NAME_MAX_LENGTH } from '@vyte/contracts/photos-limits';
/** What the backend accepts as a photo. Not HEIC: iOS then hands over a JPEG. */
export const PHOTO_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
