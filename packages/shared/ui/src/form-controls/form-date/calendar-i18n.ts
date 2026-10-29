import { BrnCalendarI18n } from '@spartan-ng/brain/calendar';

type Weekday = ReturnType<BrnCalendarI18n['firstDayOfWeek']>;
type Months = ReturnType<BrnCalendarI18n['months']>;

interface WeekInfo {
  firstDay: number;
}

/** `Intl.Locale` with the week info, which is not part of the TypeScript lib yet. */
type LocaleWithWeekInfo = Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };

function firstDayOfWeek(locale: string): Weekday {
  const info: LocaleWithWeekInfo = new Intl.Locale(locale);
  // `Intl` counts Monday as 1 and Sunday as 7, the calendar counts Sunday as 0.
  const day = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 1;
  return (day % 7) as Weekday;
}

/** Labels of the calendar for a locale: month and weekday names, header and the first weekday. */
export function calendarI18n(
  locale: string,
  labels: { previousMonth: string; nextMonth: string },
): Partial<BrnCalendarI18n> {
  // 2 January 2000 was a Sunday, which is weekday 0.
  const weekday = (index: number, width: 'short' | 'long'): string =>
    new Date(2000, 0, 2 + index).toLocaleDateString(locale, { weekday: width });
  const month = (index: number): string =>
    new Date(2000, index).toLocaleDateString(locale, { month: 'short' });
  const firstDay = firstDayOfWeek(locale);

  return {
    formatWeekdayName: (index) => weekday(index, 'short'),
    labelWeekday: (index) => weekday(index, 'long'),
    months: () => Array.from({ length: 12 }, (_, index) => month(index)) as Months,
    formatMonth: month,
    formatHeader: (monthIndex, year) =>
      new Date(year, monthIndex).toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    labelPrevious: () => labels.previousMonth,
    labelNext: () => labels.nextMonth,
    firstDayOfWeek: () => firstDay,
  };
}
