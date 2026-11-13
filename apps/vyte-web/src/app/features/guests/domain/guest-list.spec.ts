import { Guest } from './guest';
import {
  clampPage,
  countGuests,
  countPages,
  filterGuests,
  GUEST_PAGE_SIZE,
  guestLinkUrl,
  pageOf,
  parseNames,
  sortGuests,
  toGuestFilter,
  toGuestSort,
} from './guest-list';

const guest = (id: string, name: string, overrides: Partial<Guest> = {}): Guest => ({
  id,
  name,
  note: null,
  maxCompanions: 0,
  token: `token-${id}`,
  photoToken: `photo-${id}`,
  response: 'pending',
  companions: 0,
  companionsReduced: false,
  message: null,
  answeredBy: null,
  respondedAt: null,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  updatedAt: new Date('2026-11-01T09:00:00.000Z'),
  ...overrides,
});

const names = (guests: Guest[]) => guests.map((existing) => existing.name);

describe('countGuests', () => {
  it('counts zero for an empty list', () => {
    expect(countGuests([])).toEqual({ invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 });
  });

  it('counts people who come with their companions, and guests who declined or are open', () => {
    const counts = countGuests([
      guest('1', 'Ada', { response: 'accepted', companions: 2, maxCompanions: 3 }),
      guest('2', 'Ben', { response: 'accepted', companions: 0, maxCompanions: 1 }),
      guest('3', 'Cleo', { response: 'declined', maxCompanions: 2 }),
      guest('4', 'Dan'),
      guest('5', 'Eva', { maxCompanions: 1 }),
    ]);

    expect(counts).toEqual({ invited: 5, coming: 4, declined: 1, pending: 2, atMost: 12 });
  });

  it('does not count the companions of a guest who declined', () => {
    const counts = countGuests([guest('1', 'Ada', { response: 'declined', companions: 2 })]);

    expect(counts.coming).toBe(0);
    expect(counts.declined).toBe(1);
  });
});

describe('filterGuests', () => {
  const guests = [
    guest('1', 'José García', { response: 'accepted' }),
    guest('2', 'Ada Lovelace', { response: 'declined' }),
    guest('3', 'Grace Hopper'),
  ];

  it('keeps everybody for "all" and an empty query', () => {
    expect(filterGuests(guests, 'all', '')).toHaveLength(3);
  });

  it('keeps the guests with the chosen answer', () => {
    expect(names(filterGuests(guests, 'declined', ''))).toEqual(['Ada Lovelace']);
    expect(names(filterGuests(guests, 'pending', ''))).toEqual(['Grace Hopper']);
  });

  it('finds a name without regard to case and accents', () => {
    expect(names(filterGuests(guests, 'all', 'jose'))).toEqual(['José García']);
    expect(names(filterGuests(guests, 'all', 'GARCIA'))).toEqual(['José García']);
  });

  it('finds an accented query in an unaccented name', () => {
    expect(names(filterGuests(guests, 'all', 'Ádá'))).toEqual(['Ada Lovelace']);
  });

  it('finds a part of the name and ignores surrounding spaces of the query', () => {
    expect(names(filterGuests(guests, 'all', '  love '))).toEqual(['Ada Lovelace']);
  });

  it('combines filter and query', () => {
    expect(filterGuests(guests, 'pending', 'ada')).toEqual([]);
    expect(names(filterGuests(guests, 'declined', 'ada'))).toEqual(['Ada Lovelace']);
  });

  it('finds nobody for an unknown query', () => {
    expect(filterGuests(guests, 'all', 'zzz')).toEqual([]);
  });
});

describe('sortGuests', () => {
  const answered = (id: string, name: string, at: string) =>
    guest(id, name, { response: 'accepted', respondedAt: new Date(at) });

  it('sorts by name regardless of case and accents', () => {
    const sorted = sortGuests(
      [guest('1', 'ben'), guest('2', 'Édith'), guest('3', 'Ada'), guest('4', 'Zoe')],
      'name',
      'de-DE',
    );

    expect(names(sorted)).toEqual(['Ada', 'ben', 'Édith', 'Zoe']);
  });

  it('does not change the list it is given', () => {
    const list = [guest('1', 'Zoe'), guest('2', 'Ada')];

    sortGuests(list, 'name', 'de-DE');

    expect(names(list)).toEqual(['Zoe', 'Ada']);
  });

  it('puts the newest answers first and the guests without an answer last', () => {
    const sorted = sortGuests(
      [
        guest('1', 'Ada'),
        answered('2', 'Ben', '2026-11-02T10:00:00.000Z'),
        answered('3', 'Cleo', '2026-11-05T10:00:00.000Z'),
        guest('4', 'Anna'),
      ],
      'answered',
      'de-DE',
    );

    expect(names(sorted)).toEqual(['Cleo', 'Ben', 'Ada', 'Anna']);
  });

  it('breaks a tie of the answer time by name', () => {
    const sorted = sortGuests(
      [
        answered('1', 'Zoe', '2026-11-02T10:00:00.000Z'),
        answered('2', 'Ada', '2026-11-02T10:00:00.000Z'),
      ],
      'answered',
      'de-DE',
    );

    expect(names(sorted)).toEqual(['Ada', 'Zoe']);
  });

  it('handles an empty list', () => {
    expect(sortGuests([], 'answered', 'de-DE')).toEqual([]);
  });
});

describe('parseNames', () => {
  it('gives one name per line, trimmed, without empty lines', () => {
    expect(parseNames('  Ada Lovelace \n\n Grace Hopper\n   \nAlan')).toEqual([
      'Ada Lovelace',
      'Grace Hopper',
      'Alan',
    ]);
  });

  it('understands Windows line breaks', () => {
    expect(parseNames('Ada\r\nGrace\r\n')).toEqual(['Ada', 'Grace']);
  });

  it('gives nothing for blank text', () => {
    expect(parseNames('')).toEqual([]);
    expect(parseNames(' \n \n')).toEqual([]);
  });
});

describe('guestLinkUrl', () => {
  it('points at the personal page of the guest', () => {
    expect(guestLinkUrl('https://vyte.example.com', 'abc123')).toBe(
      'https://vyte.example.com/rsvp/abc123',
    );
  });

  it('encodes the token', () => {
    expect(guestLinkUrl('https://vyte.example.com', 'a/b c')).toBe(
      'https://vyte.example.com/rsvp/a%2Fb%20c',
    );
  });
});

describe('toGuestFilter', () => {
  it.each(['all', 'accepted', 'declined', 'pending'] as const)('keeps %s', (value) => {
    expect(toGuestFilter(value)).toBe(value);
  });

  it.each([undefined, '', 'ACCEPTED', 'coming', 'name'])('falls back to all for %j', (value) => {
    expect(toGuestFilter(value)).toBe('all');
  });
});

describe('toGuestSort', () => {
  it.each(['name', 'answered'] as const)('keeps %s', (value) => {
    expect(toGuestSort(value)).toBe(value);
  });

  it.each([undefined, '', 'Name', 'accepted', 'date'])('falls back to name for %j', (value) => {
    expect(toGuestSort(value)).toBe('name');
  });
});

describe('countPages', () => {
  it('has 25 guests to a page', () => {
    expect(GUEST_PAGE_SIZE).toBe(25);
  });

  it.each([
    [0, 1],
    [1, 1],
    [25, 1],
    [26, 2],
    [50, 2],
    [51, 3],
  ])('takes %i entries %i page(s)', (total, pages) => {
    expect(countPages(total)).toBe(pages);
  });

  it('counts with a given size', () => {
    expect(countPages(11, 5)).toBe(3);
  });
});

describe('clampPage', () => {
  it.each([
    [1, 3, 1],
    [2, 3, 2],
    [3, 3, 3],
    [4, 3, 3],
    [999, 3, 3],
    [0, 3, 1],
    [-4, 3, 1],
    [NaN, 3, 1],
    [Infinity, 3, 1],
    [2.7, 3, 2],
    [0.5, 3, 1],
    [5, 1, 1],
  ])('turns page %f of %i into %i', (page, count, expected) => {
    expect(clampPage(page, count)).toBe(expected);
  });
});

describe('pageOf', () => {
  const items = Array.from({ length: 60 }, (_, index) => index + 1);

  it('takes 25 entries from the first page', () => {
    expect(pageOf(items, 1)).toEqual(items.slice(0, 25));
  });

  it('takes the next ones and a shorter last page', () => {
    expect(pageOf(items, 2)).toEqual(items.slice(25, 50));
    expect(pageOf(items, 3)).toEqual(items.slice(50));
  });

  it('is empty beyond the end and for an empty list', () => {
    expect(pageOf(items, 4)).toEqual([]);
    expect(pageOf([], 1)).toEqual([]);
  });

  it('uses a given size and leaves the list alone', () => {
    expect(pageOf(items, 2, 10)).toEqual(items.slice(10, 20));
    expect(items).toHaveLength(60);
  });
});
