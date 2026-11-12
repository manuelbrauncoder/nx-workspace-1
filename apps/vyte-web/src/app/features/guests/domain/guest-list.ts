import { EventCounts, Guest, GuestResponse } from './guest';

/** Which guests the list shows: all, or those with one answer. */
export type GuestFilter = 'all' | GuestResponse;

/** By name, or the newest answers first. */
export type GuestSort = 'name' | 'answered';

/** The numbers of the guest list overview (spec section 5), counted from the guests. */
export function countGuests(guests: readonly Guest[]): EventCounts {
  const counts: EventCounts = { invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 };
  for (const guest of guests) {
    counts.invited += 1;
    counts.atMost += 1 + guest.maxCompanions;
    if (guest.response === 'accepted') {
      counts.coming += 1 + guest.companions;
    } else {
      counts[guest.response] += 1;
    }
  }
  return counts;
}

/** Lower case and without accents, so "jose" finds "José". */
function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

/** The guests with the answer of the filter whose name contains the query. */
export function filterGuests(
  guests: readonly Guest[],
  filter: GuestFilter,
  query: string,
): Guest[] {
  const needle = searchable(query);
  return guests.filter(
    (guest) =>
      (filter === 'all' || guest.response === filter) &&
      (needle === '' || searchable(guest.name).includes(needle)),
  );
}

/** A new list in the order of `sort`. Guests without an answer come last when sorting by it. */
export function sortGuests(guests: readonly Guest[], sort: GuestSort, locale: string): Guest[] {
  const byName = (a: Guest, b: Guest) =>
    a.name.localeCompare(b.name, locale, { sensitivity: 'base' });
  if (sort === 'name') {
    return [...guests].sort(byName);
  }
  return [...guests].sort((a, b) => {
    if (!a.respondedAt || !b.respondedAt) {
      return a.respondedAt ? -1 : b.respondedAt ? 1 : byName(a, b);
    }
    return b.respondedAt.getTime() - a.respondedAt.getTime() || byName(a, b);
  });
}

/** One name per line, without empty lines and surrounding spaces. */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** Address of the personal page of a guest, for the hosts to copy and pass on. */
export function guestLinkUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/rsvp/${encodeURIComponent(token)}`;
}
