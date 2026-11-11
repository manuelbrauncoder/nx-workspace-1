import { GuestResponse } from '../guests/guest';

/** An image of the event. Its address comes from `RsvpRepository.imageUrl()`. */
export interface InvitationImage {
  id: string;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  /** Place in the gallery, starting at 0. The first image is the cover. */
  position: number;
}

/** The event as a guest sees it. */
export interface InvitationEvent {
  title: string;
  /** Rich text as HTML, `''` when empty. Untrusted, show it with `app-ui-rich-text` only. */
  description: string;
  locationName: string | null;
  address: string | null;
  /** Without times: `startsAt` and `endsAt` are then midnight in `timeZone`. */
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  /** IANA name. Times of the event are shown in it, not in the browser's. */
  timeZone: string;
  rsvpDeadline: Date | null;
  /** Sorted by `position`. */
  images: InvitationImage[];
  /** Names of the owner and the editors, without the ones who gave their account no name. */
  hosts: string[];
}

/** The guest the personal link belongs to, with their answer so far. */
export interface InvitationGuest {
  name: string;
  /** How many people the guest may bring. */
  maxCompanions: number;
  response: GuestResponse;
  companions: number;
  message: string | null;
  respondedAt: Date | null;
}

export interface UpcomingInvitation {
  past: false;
  /** Whether the guest can still answer. `false` after the deadline. */
  open: boolean;
  event: InvitationEvent;
  guest: InvitationGuest;
}

/** After the event the page only says that it is over. */
export interface PastInvitation {
  past: true;
  event: { title: string };
}

/** What the personal page of a guest (`/rsvp/<token>`) shows. */
export type Invitation = UpcomingInvitation | PastInvitation;

/** What a guest answers. */
export interface RsvpAnswer {
  response: 'accepted' | 'declined';
  /** Ignored for a decline. */
  companions: number;
  /** Empty when there is none. */
  message: string;
}

// The limit of the API, so the form can report it before sending.
export { GUEST_MESSAGE_MAX_LENGTH } from '@vyte/contracts/guests-limits';
