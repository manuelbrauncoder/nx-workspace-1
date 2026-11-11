import { describe, expect, it } from 'vitest';
import { endOfLocalDay, eventEnd, isPast } from './events.time.js';

const berlin = 'Europe/Berlin';
const newYork = 'America/New_York';

const at = (iso: string) => new Date(iso);

describe('endOfLocalDay', () => {
  it('is the next local midnight in winter and in summer', () => {
    // CET is UTC+1, CEST is UTC+2
    expect(endOfLocalDay(at('2027-01-15T10:00:00Z'), berlin)).toEqual(at('2027-01-15T23:00:00Z'));
    expect(endOfLocalDay(at('2027-06-15T10:00:00Z'), berlin)).toEqual(at('2027-06-15T22:00:00Z'));
  });

  it('belongs to the local day, not the UTC day', () => {
    // 23:30 local in Berlin in summer is still the 15th, 00:30 local is already the 16th
    expect(endOfLocalDay(at('2027-06-15T21:30:00Z'), berlin)).toEqual(at('2027-06-15T22:00:00Z'));
    expect(endOfLocalDay(at('2027-06-15T22:30:00Z'), berlin)).toEqual(at('2027-06-16T22:00:00Z'));
  });

  it('is exactly the next day when the instant is local midnight', () => {
    expect(endOfLocalDay(at('2027-06-14T22:00:00Z'), berlin)).toEqual(at('2027-06-15T22:00:00Z'));
  });

  it('handles the day summer time starts in Europe/Berlin (23 hours, 28 March 2027)', () => {
    // 00:30 CET on the 28th; the day ends at 00:00 CEST on the 29th = 22:00 UTC
    expect(endOfLocalDay(at('2027-03-27T23:30:00Z'), berlin)).toEqual(at('2027-03-28T22:00:00Z'));
    // 12:00 CEST
    expect(endOfLocalDay(at('2027-03-28T10:00:00Z'), berlin)).toEqual(at('2027-03-28T22:00:00Z'));
    // the day before is a normal 24 hour day ending 23:00 UTC
    expect(endOfLocalDay(at('2027-03-27T20:00:00Z'), berlin)).toEqual(at('2027-03-27T23:00:00Z'));
  });

  it('handles the day summer time ends in Europe/Berlin (25 hours, 31 October 2027)', () => {
    // 02:30 CEST on the 31st (first pass); the day ends at 00:00 CET on 1 November = 23:00 UTC
    expect(endOfLocalDay(at('2027-10-31T00:30:00Z'), berlin)).toEqual(at('2027-10-31T23:00:00Z'));
    // 02:30 CET (second pass of the repeated hour)
    expect(endOfLocalDay(at('2027-10-31T01:30:00Z'), berlin)).toEqual(at('2027-10-31T23:00:00Z'));
    // the day before still ends at 22:00 UTC
    expect(endOfLocalDay(at('2027-10-30T12:00:00Z'), berlin)).toEqual(at('2027-10-30T22:00:00Z'));
  });

  it('works in America/New_York, which lags UTC', () => {
    // 22:00 EST on 14 January
    expect(endOfLocalDay(at('2027-01-15T03:00:00Z'), newYork)).toEqual(at('2027-01-15T05:00:00Z'));
    // 23:00 EDT on 14 June
    expect(endOfLocalDay(at('2027-06-15T03:00:00Z'), newYork)).toEqual(at('2027-06-15T04:00:00Z'));
  });

  it('handles the New York changes (14 March and 7 November 2027)', () => {
    // 14 March is 23 hours: midnight EST = 05:00 UTC, the next midnight is EDT = 04:00 UTC
    expect(endOfLocalDay(at('2027-03-14T12:00:00Z'), newYork)).toEqual(at('2027-03-15T04:00:00Z'));
    // 7 November is 25 hours: ends at midnight EST = 05:00 UTC on the 8th
    expect(endOfLocalDay(at('2027-11-07T12:00:00Z'), newYork)).toEqual(at('2027-11-08T05:00:00Z'));
  });

  it('does not depend on the zone of the machine', () => {
    // the same instant is the 15th in Berlin but still the 14th in New York
    const instant = at('2027-06-15T02:00:00Z');
    expect(endOfLocalDay(instant, berlin)).toEqual(at('2027-06-15T22:00:00Z'));
    expect(endOfLocalDay(instant, newYork)).toEqual(at('2027-06-15T04:00:00Z'));
  });
});

describe('eventEnd and isPast', () => {
  it('ends at endsAt for a timed event', () => {
    const event = {
      allDay: false,
      startsAt: at('2027-06-10T16:00:00Z'),
      endsAt: at('2027-06-10T20:00:00Z'),
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-06-10T20:00:00Z'));
    expect(isPast(event, at('2027-06-10T19:59:59Z'))).toBe(false);
    expect(isPast(event, at('2027-06-10T20:00:00Z'))).toBe(true);
  });

  it('ends at the end of the start day without endsAt', () => {
    const event = {
      allDay: false,
      startsAt: at('2027-06-10T16:00:00Z'),
      endsAt: null,
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-06-10T22:00:00Z'));
    expect(isPast(event, at('2027-06-10T21:59:59Z'))).toBe(false);
    expect(isPast(event, at('2027-06-10T22:00:00Z'))).toBe(true);
  });

  it('uses the zone of the event for an event without end', () => {
    const event = {
      allDay: false,
      startsAt: at('2027-06-10T23:00:00Z'),
      endsAt: null,
      timeZone: newYork,
    };
    // 19:00 EDT on the 10th, the day ends 04:00 UTC on the 11th
    expect(eventEnd(event)).toEqual(at('2027-06-11T04:00:00Z'));
    // in Berlin the same start is already the 11th
    expect(eventEnd({ ...event, timeZone: berlin })).toEqual(at('2027-06-11T22:00:00Z'));
  });

  it('lasts until the end of the last day for an all-day event', () => {
    // 10 to 12 June: midnight CEST of the first and the last day
    const event = {
      allDay: true,
      startsAt: at('2027-06-09T22:00:00Z'),
      endsAt: at('2027-06-11T22:00:00Z'),
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-06-12T22:00:00Z'));
    // the instant of endsAt itself is still the last day
    expect(isPast(event, at('2027-06-11T22:00:00Z'))).toBe(false);
    expect(isPast(event, at('2027-06-12T21:59:59Z'))).toBe(false);
    expect(isPast(event, at('2027-06-12T22:00:00Z'))).toBe(true);
  });

  it('lasts one day for an all-day event without end', () => {
    const event = {
      allDay: true,
      startsAt: at('2027-06-09T22:00:00Z'),
      endsAt: null,
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-06-10T22:00:00Z'));
    expect(isPast(event, at('2027-06-10T21:59:59Z'))).toBe(false);
    expect(isPast(event, at('2027-06-10T22:00:00Z'))).toBe(true);
  });

  it('counts the days of an all-day event across the change to summer time', () => {
    // 27 to 28 March 2027 in Berlin: starts 00:00 CET, the last day is the 23 hour day
    const event = {
      allDay: true,
      startsAt: at('2027-03-26T23:00:00Z'),
      endsAt: at('2027-03-27T23:00:00Z'),
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-03-28T22:00:00Z'));
    expect(isPast(event, at('2027-03-28T21:59:59Z'))).toBe(false);
    expect(isPast(event, at('2027-03-28T22:00:00Z'))).toBe(true);
  });

  it('counts the days of an all-day event across the change back to winter time', () => {
    // 30 to 31 October 2027 in Berlin: the last day has 25 hours
    const event = {
      allDay: true,
      startsAt: at('2027-10-29T22:00:00Z'),
      endsAt: at('2027-10-30T22:00:00Z'),
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-10-31T23:00:00Z'));
    expect(isPast(event, at('2027-10-31T22:30:00Z'))).toBe(false);
    expect(isPast(event, at('2027-10-31T23:00:00Z'))).toBe(true);
  });

  it('ends a timed event without end at the end of a 25 hour day', () => {
    const event = {
      allDay: false,
      startsAt: at('2027-10-31T10:00:00Z'),
      endsAt: null,
      timeZone: berlin,
    };
    expect(eventEnd(event)).toEqual(at('2027-10-31T23:00:00Z'));
  });

  it('uses the current time when no now is passed', () => {
    const past = {
      allDay: false,
      startsAt: at('2000-01-01T10:00:00Z'),
      endsAt: null,
      timeZone: berlin,
    };
    const future = { ...past, startsAt: at('2999-01-01T10:00:00Z') };
    expect(isPast(past)).toBe(true);
    expect(isPast(future)).toBe(false);
  });
});
