/** How a photo came in: through the place card of a guest, or through the photo stand. */
export type PhotoSource = 'guest' | 'stand';

/** A photo of an event as its hosts see it. Its address comes from `PhotosRepository.photoUrl()`. */
export interface Photo {
  id: string;
  source: PhotoSource;
  /** The guest of the place card, or the name someone entered at the stand. */
  uploaderName: string | null;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  /** Hidden photos stay with the hosts and are left out of the download. */
  hidden: boolean;
  createdAt: Date;
}
