import { EventCounts, Guest, GuestResponse } from './guest';

/** Which guests the list shows: all, or those with one answer. */
export type GuestFilter = 'all' | GuestResponse;

/** By name, or the newest answers first. */
export type GuestSort = 'name' | 'answered';

/** Guests on one page of the list. */
export const GUEST_PAGE_SIZE = 25;

const GUEST_FILTERS: readonly GuestFilter[] = ['all', 'accepted', 'declined', 'pending'];
const GUEST_SORTS: readonly GuestSort[] = ['name', 'answered'];

/** The filter of a query parameter, `all` for anything else. */
export function toGuestFilter(value: string | undefined): GuestFilter {
  return GUEST_FILTERS.find((filter) => filter === value) ?? 'all';
}

/** The sort of a query parameter, `name` for anything else. */
export function toGuestSort(value: string | undefined): GuestSort {
  return GUEST_SORTS.find((sort) => sort === value) ?? 'name';
}

/** How many pages a list of `total` entries takes, at least one. */
export function countPages(total: number, size = GUEST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** A page number within 1 and `pageCount`, also for a page that no longer exists. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1), pageCount);
}

/** The entries of one page, counted from 1. */
export function pageOf<T>(items: readonly T[], page: number, size = GUEST_PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

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
