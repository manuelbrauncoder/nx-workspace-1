const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

export const LOCAL_DATE_FORMATS = {
  /** `12.01.2026` */
  date: DATE,
  /** `12.01.2026, 14:05` */
  dateTime: { ...DATE, ...TIME },
  /** Weekday and month in words: `Sa., 14. März 2027` */
  weekdayDate: { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
  /** `19:00` */
  time: TIME,
  /** Day of the month alone: `14` */
  day: { day: 'numeric' },
  /** Month as a short word, e.g. `Nov` or `Mär` for `de-DE` (the exact form comes from ICU) */
  monthShort: { month: 'short' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type LocalDateFormat = keyof typeof LOCAL_DATE_FORMATS;

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Formats a date for a locale, e.g. `12.01.2026, 14:05` for `de-DE` and `dateTime`. Without
 * `timeZone` it uses the zone of the runtime, which is UTC on the server: pass the zone of the
 * thing the date belongs to (an event) whenever the time of day matters.
 */
export function formatLocalDate(
  date: Date,
  locale: string,
  format: LocalDateFormat,
  timeZone?: string,
): string {
  const id = `${locale}/${format}/${timeZone ?? ''}`;
  let formatter = formatters.get(id);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...LOCAL_DATE_FORMATS[format], timeZone });
    formatters.set(id, formatter);
  }
  return formatter.format(date);
}
