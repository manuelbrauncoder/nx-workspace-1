import { formatLocalDate } from './local-date';

describe('formatLocalDate', () => {
  const date = new Date(2026, 0, 12, 14, 5);

  it('formats a date for the German locale', () => {
    expect(formatLocalDate(date, 'de-DE', 'date')).toBe('12.01.2026');
    expect(formatLocalDate(date, 'de-DE', 'dateTime')).toBe('12.01.2026, 14:05');
  });

  it('formats a date for the English locale', () => {
    expect(formatLocalDate(date, 'en-GB', 'date')).toBe('12/01/2026');
    expect(formatLocalDate(date, 'en-GB', 'dateTime')).toBe('12/01/2026, 14:05');
  });

  it('formats the weekday in words and the time on its own', () => {
    expect(formatLocalDate(date, 'de-DE', 'weekdayDate')).toBe('Mo., 12. Januar 2026');
    expect(formatLocalDate(date, 'en-GB', 'weekdayDate')).toBe('Mon, 12 January 2026');
    expect(formatLocalDate(date, 'de-DE', 'time')).toBe('14:05');
  });

  it('formats in the given time zone, whatever the zone of the runtime', () => {
    const winter = new Date('2027-03-14T18:00:00.000Z');
    const summer = new Date('2027-07-14T17:00:00.000Z');

    expect(formatLocalDate(winter, 'de-DE', 'time', 'Europe/Berlin')).toBe('19:00');
    expect(formatLocalDate(summer, 'de-DE', 'time', 'Europe/Berlin')).toBe('19:00');
    expect(formatLocalDate(winter, 'de-DE', 'time', 'America/New_York')).toBe('14:00');
    expect(
      formatLocalDate(new Date('2027-03-14T23:30:00.000Z'), 'de-DE', 'date', 'Europe/Berlin'),
    ).toBe('15.03.2027');
  });
});
