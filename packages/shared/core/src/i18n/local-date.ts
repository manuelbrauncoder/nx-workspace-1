const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

export const LOCAL_DATE_FORMATS = {
  date: DATE,
  dateTime: { ...DATE, hour: '2-digit', minute: '2-digit' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type LocalDateFormat = keyof typeof LOCAL_DATE_FORMATS;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Formats a date for a locale, e.g. `12.01.2026, 14:05` for `de-DE` and `dateTime`. */
export function formatLocalDate(date: Date, locale: string, format: LocalDateFormat): string {
  const id = `${locale}/${format}`;
  let formatter = formatters.get(id);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, LOCAL_DATE_FORMATS[format]);
    formatters.set(id, formatter);
  }
  return formatter.format(date);
}
