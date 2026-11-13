import { Guest } from './print';
import {
  guestPhotosUrl,
  PLACE_CARDS_PER_SHEET,
  placeCardGuests,
  standUrl,
  toSheets,
} from './print-sheets';

const guest = (name: string, response: Guest['response'] = 'pending'): Guest =>
  ({ id: name, name, response, photoToken: `photo-${name}` }) as Guest;

const names = (guests: Guest[]) => guests.map((item) => item.name);

describe('placeCardGuests', () => {
  const GUESTS = [
    guest('Cleo', 'accepted'),
    guest('Ada', 'declined'),
    guest('Ben', 'accepted'),
    guest('Dan', 'pending'),
  ];

  it('keeps every guest for "all", sorted by name', () => {
    expect(names(placeCardGuests(GUESTS, 'all', 'de'))).toEqual(['Ada', 'Ben', 'Cleo', 'Dan']);
  });

  it('keeps only the guests who accepted for "accepted"', () => {
    expect(names(placeCardGuests(GUESTS, 'accepted', 'de'))).toEqual(['Ben', 'Cleo']);
  });

  it('is empty when nobody accepted or the list is empty', () => {
    expect(placeCardGuests([guest('Ada')], 'accepted', 'de')).toEqual([]);
    expect(placeCardGuests([], 'all', 'de')).toEqual([]);
  });

  it('sorts with the locale and ignores case and accents', () => {
    const list = [guest('Zoe'), guest('Ärger'), guest('anna'), guest('Bert')];

    expect(names(placeCardGuests(list, 'all', 'de'))).toEqual(['anna', 'Ärger', 'Bert', 'Zoe']);
    // In Swedish "ä" comes after "z".
    expect(names(placeCardGuests(list, 'all', 'sv'))).toEqual(['anna', 'Bert', 'Zoe', 'Ärger']);
  });

  it('does not change the given list', () => {
    const list = [guest('Bert'), guest('Anna')];

    placeCardGuests(list, 'all', 'de');

    expect(names(list)).toEqual(['Bert', 'Anna']);
  });
});

describe('toSheets', () => {
  it('puts four cards on a sheet', () => {
    expect(PLACE_CARDS_PER_SHEET).toBe(4);
    expect(toSheets([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
  });

  it('lets the last sheet hold fewer', () => {
    expect(toSheets([1, 2, 3, 4, 5])).toEqual([[1, 2, 3, 4], [5]]);
    expect(toSheets([1])).toEqual([[1]]);
  });

  it('has no sheet without cards', () => {
    expect(toSheets([])).toEqual([]);
  });

  it('takes another size', () => {
    expect(toSheets([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});

describe('guestPhotosUrl and standUrl', () => {
  it('build the upload addresses on the site', () => {
    expect(guestPhotosUrl('https://vyte.example.com', 'abc')).toBe(
      'https://vyte.example.com/photos/abc',
    );
    expect(standUrl('https://vyte.example.com', 'abc')).toBe('https://vyte.example.com/stand/abc');
  });

  it('encode the token', () => {
    expect(guestPhotosUrl('https://v.example', 'a b/c?d#e')).toBe(
      'https://v.example/photos/a%20b%2Fc%3Fd%23e',
    );
    expect(standUrl('https://v.example', 'a b/c')).toBe('https://v.example/stand/a%20b%2Fc');
  });
});
