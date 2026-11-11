import { describe, expect, it } from 'vitest';
import { type ExportGuest, exportFileName, guestsCsv } from './guests.export.js';

const BOM = '﻿';
const berlin = { timeZone: 'Europe/Berlin', language: 'de' as const };

function guest(extra: Partial<ExportGuest> = {}): ExportGuest {
  return {
    name: 'Grace',
    maxCompanions: 0,
    response: 'pending',
    companions: 0,
    message: null,
    note: null,
    answeredBy: null,
    respondedAt: null,
    ...extra,
  };
}

/** The data rows without the heading row, split at the CRLF the export ends rows with. */
function rows(csv: string): string[] {
  return csv.split('\r\n').slice(1, -1);
}

describe('guestsCsv', () => {
  describe('format', () => {
    it('starts with the BOM, uses ; and CRLF and ends with a CRLF', () => {
      const csv = guestsCsv([guest()], berlin);
      expect(csv.startsWith(BOM + '"Name";"Begleitung erlaubt"')).toBe(true);
      expect(csv.endsWith('\r\n')).toBe(true);
      expect(csv.split('\r\n')).toHaveLength(3);
      expect(csv.slice(1)).not.toMatch(/(?<!\r)\n/);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('quotes every cell, also numbers and empty ones', () => {
      const [row] = rows(guestsCsv([guest()], berlin));
      expect(row).toBe('"Grace";"0";"Offen";"0";"0";"";"";"";""');
    });

    it('doubles quotes inside a cell', () => {
      const [row] = rows(guestsCsv([guest({ name: 'Ann "Annie" Lee' })], berlin));
      expect(row!.startsWith('"Ann ""Annie"" Lee";')).toBe(true);
    });

    it('keeps ; inside the cell', () => {
      const csv = guestsCsv([guest({ name: 'a;b' })], berlin);
      expect(csv).toContain('"a;b";');
    });

    it('turns line breaks inside a cell into a single space', () => {
      const csv = guestsCsv([guest({ note: 'line1\r\nline2\nline3\rline4' })], berlin);
      expect(csv).toContain('"line1 line2 line3 line4"');
      expect(csv.split('\r\n')).toHaveLength(3);
      expect(csv).not.toMatch(/(?<!\r)\n/);
    });
  });

  describe('formula guard', () => {
    it.each(['=1+1', '+1', '-1', '@SUM(A1)', '  =1+1', ' \t-1', '\t=1', '\r=1'])(
      'prefixes %j with a quote',
      (value) => {
        const [row] = rows(guestsCsv([guest({ name: value })], berlin));
        // a CR is a line break and becomes a space; the guard then goes before the trigger
        const text = value.replace(/[\r\n]+/g, ' ');
        const guarded = `'${text}`;
        expect(row!.startsWith(`"${guarded}";`)).toBe(true);
      },
    );

    it.each([
      ['x, =1+1', "x, '=1+1"],
      ['x,=1', "x,'=1"],
      ['a;-b', "a;'-b"],
      ['a;  @b', "a;  '@b"],
      ['1,+2;-3', "1,'+2;'-3"],
    ])('guards a trigger after a separator in %j', (value, expected) => {
      const [row] = rows(guestsCsv([guest({ note: value })], berlin));
      expect(row).toContain(`;"${expected}";`);
    });

    it('does not guard a trigger inside a word or after other text', () => {
      const [row] = rows(guestsCsv([guest({ note: 'a-b, c+d x=y' })], berlin));
      expect(row).toContain(';"a-b, c+d x=y";');
    });

    it('guards the note and the message too', () => {
      const [row] = rows(guestsCsv([guest({ note: '=cmd', message: '@x' })], berlin));
      expect(row).toContain(`;"'@x";"'=cmd";`);
    });

    it('leaves harmless text alone', () => {
      const [row] = rows(guestsCsv([guest({ name: 'Anna = best', note: 'a-b' })], berlin));
      expect(row!.startsWith('"Anna = best";')).toBe(true);
      expect(row).toContain('"a-b"');
    });

    it('never prefixes numbers', () => {
      const [row] = rows(
        guestsCsv([guest({ response: 'accepted', maxCompanions: 3, companions: 2 })], berlin),
      );
      expect(row).toBe('"Grace";"3";"Zugesagt";"2";"3";"";"";"";""');
      expect(row).not.toContain("'");
    });
  });

  describe('columns and labels', () => {
    it('has the German headings and answers', () => {
      const csv = guestsCsv(
        [
          guest({ response: 'accepted', answeredBy: 'guest' }),
          guest({ response: 'declined', answeredBy: 'host' }),
          guest(),
        ],
        berlin,
      );
      const [head, ...data] = csv.slice(1).split('\r\n');
      expect(head).toBe(
        '"Name";"Begleitung erlaubt";"Antwort";"Begleitung";"Personen";"Nachricht";"Notiz";"Eingetragen von";"Geantwortet am"',
      );
      expect(data[0]).toContain('"Zugesagt"');
      expect(data[0]).toContain('"Gast"');
      expect(data[1]).toContain('"Abgesagt"');
      expect(data[1]).toContain('"Host"');
      expect(data[2]).toContain('"Offen"');
    });

    it('has the English headings and answers', () => {
      const csv = guestsCsv(
        [
          guest({ response: 'accepted', answeredBy: 'guest' }),
          guest({ response: 'declined', answeredBy: 'host' }),
          guest(),
        ],
        { ...berlin, language: 'en' },
      );
      const [head, ...data] = csv.slice(1).split('\r\n');
      expect(head).toBe(
        '"Name";"Companions allowed";"Answer";"Companions";"People";"Message";"Note";"Answered by";"Answered at"',
      );
      expect(data[0]).toContain('"Accepted"');
      expect(data[0]).toContain('"Guest"');
      expect(data[1]).toContain('"Declined"');
      expect(data[1]).toContain('"Host"');
      expect(data[2]).toContain('"Pending"');
    });
  });

  describe('people and companions', () => {
    it('counts 1 + companions for an accepted guest', () => {
      const [row] = rows(guestsCsv([guest({ response: 'accepted', companions: 2 })], berlin));
      expect(row).toContain('"Zugesagt";"2";"3"');
    });

    it('counts 0 people and 0 companions unless accepted', () => {
      const declined = rows(guestsCsv([guest({ response: 'declined', companions: 2 })], berlin));
      const pending = rows(guestsCsv([guest({ response: 'pending', companions: 2 })], berlin));
      expect(declined[0]).toContain('"Abgesagt";"0";"0"');
      expect(pending[0]).toContain('"Offen";"0";"0"');
    });

    it('counts an accepted guest without companions as 1 person', () => {
      const [row] = rows(guestsCsv([guest({ response: 'accepted' })], berlin));
      expect(row).toContain('"Zugesagt";"0";"1"');
    });
  });

  describe('empty values', () => {
    it('writes message, note, answeredBy and respondedAt as ""', () => {
      const [row] = rows(guestsCsv([guest()], berlin));
      expect(row!.endsWith(';"";"";"";""')).toBe(true);
    });

    it('writes the texts when present', () => {
      const [row] = rows(
        guestsCsv(
          [
            guest({
              response: 'accepted',
              message: 'See you',
              note: 'Friend',
              answeredBy: 'guest',
              respondedAt: new Date('2027-07-14T17:05:00Z'),
            }),
          ],
          berlin,
        ),
      );
      expect(row).toBe(
        '"Grace";"0";"Zugesagt";"0";"1";"See you";"Friend";"Gast";"2027-07-14 19:05"',
      );
    });

    it('gives only the heading row for no guests', () => {
      const csv = guestsCsv([], berlin);
      expect(csv.split('\r\n')).toHaveLength(2);
      expect(rows(csv)).toEqual([]);
    });
  });

  describe('respondedAt in the event time zone', () => {
    const at = (iso: string, timeZone: string) =>
      rows(
        guestsCsv([guest({ respondedAt: new Date(iso), answeredBy: 'guest' })], {
          timeZone,
          language: 'en',
        }),
      )[0]!
        .split(';')
        .at(-1);

    it('uses Berlin summer time (UTC+2)', () => {
      expect(at('2027-07-14T17:05:00Z', 'Europe/Berlin')).toBe('"2027-07-14 19:05"');
    });

    it('uses Berlin winter time (UTC+1)', () => {
      expect(at('2027-01-14T17:05:00Z', 'Europe/Berlin')).toBe('"2027-01-14 18:05"');
    });

    it('uses America/New_York (UTC-4 in summer)', () => {
      expect(at('2027-07-14T17:05:00Z', 'America/New_York')).toBe('"2027-07-14 13:05"');
    });

    it('moves to the next or the previous day with the zone', () => {
      expect(at('2027-07-14T23:30:00Z', 'Europe/Berlin')).toBe('"2027-07-15 01:30"');
      expect(at('2027-07-14T02:30:00Z', 'America/New_York')).toBe('"2027-07-13 22:30"');
    });
  });
});

describe('exportFileName', () => {
  it('keeps umlauts and replaces spaces and punctuation with one dash', () => {
    expect(exportFileName('Annas 30. Geburtstag!', 'de')).toBe('Annas-30-Geburtstag-gaeste.csv');
    expect(exportFileName('Größe & Fülle: Fest', 'de')).toBe('Größe-Fülle-Fest-gaeste.csv');
  });

  it('uses the English name for en', () => {
    expect(exportFileName('Summer party', 'en')).toBe('Summer-party-guests.csv');
  });

  it('falls back to the list name when nothing is left', () => {
    expect(exportFileName('!!!', 'de')).toBe('gaeste.csv');
    expect(exportFileName('!!!', 'en')).toBe('guests.csv');
    expect(exportFileName('', 'de')).toBe('gaeste.csv');
  });

  it('cuts the title at 60 characters', () => {
    const name = exportFileName('a'.repeat(100), 'en');
    expect(name).toBe(`${'a'.repeat(60)}-guests.csv`);
  });

  it('does not leave a trailing dash after the cut', () => {
    const title = `${'a'.repeat(59)} bbb`;
    expect(exportFileName(title, 'en')).toBe(`${'a'.repeat(59)}-guests.csv`);
    expect(exportFileName(`${'a'.repeat(59)} bbb`, 'de')).not.toContain('--');
  });

  it('cuts by code points and never ends in half a surrogate pair', () => {
    // 𝐀 (U+1D400) is a letter outside the BMP: 2 UTF-16 units
    const title = `${'a'.repeat(59)}𝐀𝐀`;
    const name = exportFileName(title, 'en');
    expect(name).toBe(`${'a'.repeat(59)}𝐀-guests.csv`);
    expect(name).not.toMatch(
      /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/,
    );
    expect(Array.from(name.replace('-guests.csv', ''))).toHaveLength(60);
  });

  it('never contains path or header characters', () => {
    const name = exportFileName('../../etc/passwd"\r\nX: y', 'en');
    expect(name).toMatch(/^[\p{L}\p{N}-]+\.csv$/u);
  });
});
