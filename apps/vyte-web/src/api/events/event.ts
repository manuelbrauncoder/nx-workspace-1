/** What the signed-in user is in an event. Exactly one owner, the others are editors. */
export type MemberRole = 'owner' | 'editor';

export interface EventImage {
  id: string;
  /** Address of the file on the backend. It needs the session cookie, an `<img>` sends it. */
  url: string;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  /** Place in the gallery, starting at 0. The first image is the cover. */
  position: number;
}

/** How the guests answered, counted in people where it says so. */
export interface EventCounts {
  /** Guests on the list. */
  invited: number;
  /** People who come: guests who accepted plus their companions. */
  coming: number;
  declined: number;
  pending: number;
  /** People if everyone came with every companion they may bring. */
  atMost: number;
}

/** The save-the-date page of an event, reachable under `/save-the-date/<token>`. */
export interface SaveTheDateLink {
  token: string;
  note: string | null;
}

/** The shared upload page of an event, reachable under `/stand/<token>`. */
export interface PhotoStandLink {
  token: string;
}

/**
 * An event as a member of it sees it. Named `VyteEvent`, because `Event` is the DOM event in
 * every file that does not import it.
 */
export interface VyteEvent {
  id: string;
  title: string;
  /** Rich text as HTML, `''` when empty. Untrusted, show it with `app-ui-rich-text` only. */
  description: string;
  locationName: string | null;
  address: string | null;
  /** Without times: `startsAt` and `endsAt` are then midnight in `timeZone`. */
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  /** IANA name, e.g. `Europe/Berlin`. Times of the event are shown in it, not in the browser's. */
  timeZone: string;
  rsvpDeadline: Date | null;
  role: MemberRole;
  /** Over. The backend refuses nearly every change then. */
  past: boolean;
  /** Sorted by `position`. */
  images: EventImage[];
  counts: EventCounts;
  /** `null` while the save-the-date page is off. */
  saveTheDate: SaveTheDateLink | null;
  /** `null` while the photo stand is off. */
  photoStand: PhotoStandLink | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The fields a member can edit, used for both creating and updating an event. */
export interface EventDraft {
  title: string;
  description: string;
  /** Empty when there is none. */
  locationName: string;
  address: string;
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  timeZone: string;
  rsvpDeadline: Date | null;
}

// The limits of the API, so a form can report them before sending.
export {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_EDITORS_MAX,
  EVENT_IMAGES_MAX,
  EVENT_LOCATION_NAME_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  SAVE_THE_DATE_NOTE_MAX_LENGTH,
} from '@vyte/contracts/events-limits';
/** What the backend accepts as an image. It stores WebP. */
export const EVENT_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
/** Set in the runtime config of the API, this is its default. */
export const EVENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
