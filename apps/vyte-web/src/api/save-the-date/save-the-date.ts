/**
 * The announcement of an event before the invitations go out. It shows the name of the place
 * only, never the address or who is invited.
 */
export interface UpcomingSaveTheDate {
  past: false;
  title: string;
  /** Without times: `startsAt` and `endsAt` are then midnight in `timeZone`. */
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  /** IANA name. Times of the event are shown in it, not in the browser's. */
  timeZone: string;
  locationName: string | null;
  /** A line of the hosts, e.g. "Einladung folgt". */
  note: string | null;
  /**
   * Size of the cover in pixels, `null` when the event has no image. Its address comes from
   * `SaveTheDateRepository.coverUrl()`.
   */
  cover: { width: number; height: number } | null;
}

/** After the event the page only says that it is over. */
export interface PastSaveTheDate {
  past: true;
  title: string;
}

/** What the page `/save-the-date/<token>` shows. */
export type SaveTheDate = UpcomingSaveTheDate | PastSaveTheDate;
