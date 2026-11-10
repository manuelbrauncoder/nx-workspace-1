// Free of Zod, so the frontend can import the limits without pulling Zod into its bundle.
// The numbers come from section 3 of docs/vyte/spec.md.

export const GUEST_NAME_MAX_LENGTH = 100;
/** Only the hosts see it. */
export const GUEST_NOTE_MAX_LENGTH = 500;
/** Written by the guest with their answer. */
export const GUEST_MESSAGE_MAX_LENGTH = 500;
/** 0 = comes alone, 1 = plus one, more for couples and families. */
export const GUEST_COMPANIONS_MAX = 10;

export const EVENT_GUESTS_MAX = 500;
/** Names in one pasted list. */
export const GUESTS_BULK_MAX = 100;
