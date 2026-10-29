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
});
