// Free of Zod, so the frontend can import the limits without pulling Zod into its bundle.
// The numbers come from section 3 of docs/vyte/spec.md.

export const EVENT_TITLE_MAX_LENGTH = 120;
/** Counts the HTML, not the visible text. */
export const EVENT_DESCRIPTION_MAX_LENGTH = 20_000;
export const EVENT_LOCATION_NAME_MAX_LENGTH = 200;
export const EVENT_ADDRESS_MAX_LENGTH = 500;
/** Plain text on the save-the-date page. */
export const SAVE_THE_DATE_NOTE_MAX_LENGTH = 500;

export const EVENT_IMAGES_MAX = 6;
/** Editors besides the owner. */
export const EVENT_EDITORS_MAX = 10;
