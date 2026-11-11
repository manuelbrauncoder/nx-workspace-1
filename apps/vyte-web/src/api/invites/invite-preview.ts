/** What the page of an editor invite shows before the visitor joined the event. */
export interface InvitePreview {
  eventTitle: string;
  startsAt: Date;
  allDay: boolean;
  /** IANA name. The date of the event is shown in it. */
  timeZone: string;
  /** Who invites. Missing when the owner gave their account no name. */
  ownerName: string | null;
}
