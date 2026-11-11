import { AppLanguage } from '@core/i18n/languages';

export type GuestResponse = 'pending' | 'accepted' | 'declined';

/** Who entered the answer: the guest on their page, or a host for them. */
export type AnsweredBy = 'guest' | 'host';

/** A guest of an event as its hosts see them. */
export interface Guest {
  id: string;
  name: string;
  /** For the hosts only, the guest never sees it. */
  note: string | null;
  /** How many people the guest may bring. */
  maxCompanions: number;
  /** Of the personal page `/rsvp/<token>`. */
  token: string;
  /** Of the upload page `/photos/<token>`, the QR code of the place card. */
  photoToken: string;
  response: GuestResponse;
  /** How many people the guest brings, 0 unless they accepted. */
  companions: number;
  /** A host lowered `maxCompanions` below what the guest had answered. */
  companionsReduced: boolean;
  /** What the guest wrote with their answer. */
  message: string | null;
  answeredBy: AnsweredBy | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The fields a host can edit, used for both adding and updating a guest. */
export interface GuestDraft {
  name: string;
  /** Empty when there is none. */
  note: string;
  maxCompanions: number;
}

/** Several guests at once, e.g. a pasted list of names. */
export interface GuestsBulk {
  names: string[];
  maxCompanions: number;
}

/** An answer a host records for a guest, e.g. one given in person. */
export interface HostAnswer {
  response: 'accepted' | 'declined';
  /** Ignored for a decline. */
  companions: number;
}

/** The language of the column headings of the CSV export. */
export type GuestsExportLanguage = AppLanguage;

// The limits of the API, so a form can report them before sending.
export {
  EVENT_GUESTS_MAX,
  GUEST_COMPANIONS_MAX,
  GUEST_MESSAGE_MAX_LENGTH,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTE_MAX_LENGTH,
  GUESTS_BULK_MAX,
} from '@vyte/contracts/guests-limits';
