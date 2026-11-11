import { describe, expect, it } from 'vitest';
import { calendarFile, fullLocation } from './events.calendar.js';

const now = new Date('2027-01-01T00:00:00.000Z');

function event(extra: Partial<Parameters<typeof calendarFile>[0]> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Party',
    allDay: false,
    startsAt: new Date('2027-03-14T18:00:00.000Z'),
    endsAt: null,
    timeZone: 'Europe/Berlin',
    location: null,
    ...extra,
  };
}

const build = (extra: Partial<Parameters<typeof calendarFile>[0]> = {}) =>
  calendarFile(event(extra), now);
/** Logical lines: continuation lines joined again. */
const unfolded = (file: string) => file.replace(/\r\n /g, '').split('\r\n');

describe('calendarFile', () => {
  it('builds a calendar with one event, CRLF lines and a trailing CRLF', () => {
    const file = build();
    expect(file).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//vyte//vyte-api//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:11111111-1111-4111-8111-111111111111@vyte',
        'DTSTAMP:20270101T000000Z',
        'DTSTART:20270314T180000Z',
        'SUMMARY:Party',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
    expect(file.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('uses the event id as UID', () => {
    expect(unfolded(build({ id: 'abc' }))).toContain('UID:abc@vyte');
  });

  describe('timed events', () => {
    it('has DTSTART and DTEND in UTC with an end', () => {
      const lines = unfolded(
        build({
          startsAt: new Date('2027-07-01T16:00:00.000Z'),
          endsAt: new Date('2027-07-01T20:30:00.000Z'),
        }),
      );
      expect(lines).toContain('DTSTART:20270701T160000Z');
      expect(lines).toContain('DTEND:20270701T203000Z');
    });

    it('has no DTEND without an end', () => {
      const file = build();
      expect(file).toContain('DTSTART:20270314T180000Z');
      expect(file).not.toContain('DTEND');
    });
  });

  describe('all-day events', () => {
    it('uses dates, the end being the day after the last day', () => {
      const lines = unfolded(
        build({
          allDay: true,
          startsAt: new Date('2027-06-09T22:00:00.000Z'), // 10 June 00:00 in Berlin
          endsAt: new Date('2027-06-10T10:00:00.000Z'),
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270610');
      expect(lines).toContain('DTEND;VALUE=DATE:20270611');
      expect(lines.some((line) => line.startsWith('DTSTART:'))).toBe(false);
    });

    it('ends the day after the first day without an end', () => {
      const lines = unfolded(
        build({ allDay: true, startsAt: new Date('2027-06-09T22:00:00.000Z') }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270610');
      expect(lines).toContain('DTEND;VALUE=DATE:20270611');
    });

    it('runs across a month end', () => {
      const lines = unfolded(
        build({
          allDay: true,
          startsAt: new Date('2027-01-29T23:00:00.000Z'), // 30 Jan in Berlin
          endsAt: new Date('2027-02-01T10:00:00.000Z'),
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270130');
      expect(lines).toContain('DTEND;VALUE=DATE:20270202');
    });

    it('ends on the 1st when the last day is the last of the month', () => {
      const lines = unfolded(
        build({
          allDay: true,
          startsAt: new Date('2027-01-30T23:00:00.000Z'),
          endsAt: new Date('2027-01-31T10:00:00.000Z'),
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270131');
      expect(lines).toContain('DTEND;VALUE=DATE:20270201');
    });

    it('runs across the change to summer time in Berlin (28 March 2027)', () => {
      const lines = unfolded(
        build({
          allDay: true,
          startsAt: new Date('2027-03-26T23:00:00.000Z'), // 27 March 00:00 CET
          endsAt: new Date('2027-03-29T10:00:00.000Z'), // 29 March, CEST
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270327');
      expect(lines).toContain('DTEND;VALUE=DATE:20270330');
    });

    it('uses the local day where it is ahead of the UTC day (Auckland)', () => {
      const lines = unfolded(
        build({
          allDay: true,
          timeZone: 'Pacific/Auckland',
          startsAt: new Date('2027-06-09T12:00:00.000Z'), // 10 June 00:00 NZST
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270610');
      expect(lines).toContain('DTEND;VALUE=DATE:20270611');
    });

    it('uses the local day where it is behind the UTC day (Los Angeles)', () => {
      const lines = unfolded(
        build({
          allDay: true,
          timeZone: 'America/Los_Angeles',
          startsAt: new Date('2027-06-10T07:00:00.000Z'), // 10 June 00:00 PDT
          endsAt: new Date('2027-06-11T06:30:00.000Z'), // 10 June 23:30 PDT
        }),
      );
      expect(lines).toContain('DTSTART;VALUE=DATE:20270610');
      expect(lines).toContain('DTEND;VALUE=DATE:20270611');
    });
  });

  describe('text', () => {
    it('escapes backslash, comma, semicolon and newlines in the title', () => {
      const lines = unfolded(build({ title: 'A, B; C\\D\nE\r\nF' }));
      expect(lines).toContain('SUMMARY:A\\, B\\; C\\\\D\\nE\\nF');
    });

    it('escapes the location, address included', () => {
      const lines = unfolded(build({ location: 'Garden, Main street 1; 2nd floor\nGate B' }));
      expect(lines).toContain('LOCATION:Garden\\, Main street 1\\; 2nd floor\\nGate B');
    });

    it('turns a lone CR into a newline and drops other control characters', () => {
      const lines = unfolded(build({ title: 'A\rB\tC\u0000D\u007FE\u001FF' }));
      // the tab is allowed in a TEXT value and stays
      expect(lines).toContain('SUMMARY:A\\nB\tCDEF');
    });

    it('turns U+0085, U+2028 and U+2029 into newlines', () => {
      const lines = unfolded(build({ title: 'A\u0085B\u2028C\u2029D' }));
      expect(lines).toContain('SUMMARY:A\\nB\\nC\\nD');
    });

    it('has no LOCATION without one', () => {
      expect(build({ location: null })).not.toContain('LOCATION');
      expect(build({ location: '' })).not.toContain('LOCATION');
    });
  });

  describe('folding', () => {
    const octets = (line: string) => Buffer.byteLength(line);

    it('keeps short lines whole', () => {
      expect(build()).not.toContain('\r\n ');
    });

    it('folds at 75 octets, continuation lines starting with a space', () => {
      const title = 'a'.repeat(200);
      const file = build({ title });
      const physical = file.split('\r\n');
      const first = physical.findIndex((line) => line.startsWith('SUMMARY:'));
      expect(octets(physical[first]!)).toBe(75);
      expect(physical[first + 1]!.startsWith(' ')).toBe(true);
      expect(octets(physical[first + 1]!)).toBe(75);
      for (const line of physical) expect(octets(line)).toBeLessThanOrEqual(75);
      expect(unfolded(file)).toContain(`SUMMARY:${title}`);
    });

    it('never splits an umlaut and stays within 75 octets', () => {
      const title = 'Grüße aus Köln, Ärger über Öl und Äpfel '.repeat(6);
      const file = build({ title });
      for (const line of file.split('\r\n')) expect(octets(line)).toBeLessThanOrEqual(75);
      // a split multi-byte char would decode as U+FFFD
      expect(file).not.toContain('�');
      expect(unfolded(file)).toContain(`SUMMARY:${title.replace(/,/g, '\\,')}`);
    });

    it('moves a two-octet character to the next line when it does not fit', () => {
      // "SUMMARY:" is 8 octets, 66 of 'a' make 74, the next 'ä' (2) would reach 76
      const title = `${'a'.repeat(66)}ä`;
      const physical = build({ title }).split('\r\n');
      const first = physical.findIndex((line) => line.startsWith('SUMMARY:'));
      expect(physical[first]).toBe(`SUMMARY:${'a'.repeat(66)}`);
      expect(physical[first + 1]).toBe(' ä');
    });
  });
});

describe('fullLocation', () => {
  it('joins place name and address with a comma', () => {
    expect(fullLocation({ locationName: 'Garden', address: 'Main street 1' })).toBe(
      'Garden, Main street 1',
    );
  });

  it('gives what there is, or null', () => {
    expect(fullLocation({ locationName: 'Garden', address: null })).toBe('Garden');
    expect(fullLocation({ locationName: null, address: 'Main street 1' })).toBe('Main street 1');
    expect(fullLocation({ locationName: null, address: null })).toBeNull();
  });
});
