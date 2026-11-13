import { Guest } from './print';

/** Which guests get a place card. */
export type PlaceCardGuests = 'all' | 'accepted';

/** Place cards on one A4 sheet: two across, two down. */
export const PLACE_CARDS_PER_SHEET = 4;

/** The guests to print place cards for, by name as on the guest list. */
export function placeCardGuests(
  guests: readonly Guest[],
  which: PlaceCardGuests,
  locale: string,
): Guest[] {
  return guests
    .filter((guest) => which === 'all' || guest.response === 'accepted')
    .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base' }));
}

/** Splits the cards into sheets of `size`, the last one may hold fewer. */
export function toSheets<T>(items: readonly T[], size = PLACE_CARDS_PER_SHEET): T[][] {
  const sheets: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    sheets.push(items.slice(index, index + size));
  }
  return sheets;
}

/** Address of the upload page of a guest, the QR code of their place card. */
export function guestPhotosUrl(siteUrl: string, photoToken: string): string {
  return `${siteUrl}/photos/${encodeURIComponent(photoToken)}`;
}

/** Address of the shared upload page of the photo stand. */
export function standUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/stand/${encodeURIComponent(token)}`;
}
