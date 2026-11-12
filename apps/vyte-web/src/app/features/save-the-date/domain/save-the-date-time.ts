import { UpcomingSaveTheDate } from './save-the-date';

export type SaveTheDateTimeFields = Pick<
  UpcomingSaveTheDate,
  'allDay' | 'startsAt' | 'endsAt' | 'timeZone'
>;

/** The lines of the date card, each already in the language and in the zone of the event. */
export interface SaveTheDateTime {
  /** `Samstag`, or `Samstag – Montag` for several days. */
  weekday: string;
  /** `14.03.`, or `13.–15.03.` for several days. */
  dayMonth: string;
  /** `2027`, or `2027–2028` when the days span the turn of the year. */
  year: string;
  /** `19:00`, only when the event is not all-day. The page adds the "Uhr". */
  time?: string;
  /** For `<time datetime>`: the day of an all-day event (`2027-03-14`), else the instant. */
  datetime: string;
  /** The lines name the first and the last day. */
  severalDays: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

const OPTIONS = {
  weekday: { weekday: 'long' },
  dayMonth: { day: '2-digit', month: '2-digit' },
  year: { year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  isoDay: { year: 'numeric', month: '2-digit', day: '2-digit' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(
  locale: string,
  options: keyof typeof OPTIONS,
  timeZone: string,
): Intl.DateTimeFormat {
  const id = `${locale}/${options}/${timeZone}`;
  let cached = formatters.get(id);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...OPTIONS[options], timeZone });
    formatters.set(id, cached);
  }
  return cached;
}

/** The calendar day in the zone as `2027-03-14`, independent of any locale. */
function isoDay(date: Date, timeZone: string): string {
  const parts = formatter('en-US', 'isoDay', timeZone).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Date and time of an event for the save-the-date card, in the zone of the event, so the server
 * (UTC) and every browser render the same. An all-day event, or a timed one of a day or more,
 * over several days shows the first and the last day. An evening that ends after midnight stays
 * one day.
 */
export function saveTheDateTime(event: SaveTheDateTimeFields, locale: string): SaveTheDateTime {
  const { startsAt: start, endsAt: end, timeZone } = event;
  const format = (options: keyof typeof OPTIONS) => formatter(locale, options, timeZone);
  const startDay = isoDay(start, timeZone);
  const severalDays =
    end !== null &&
    isoDay(end, timeZone) !== startDay &&
    (event.allDay || end.getTime() - start.getTime() >= DAY);

  const datetime = event.allDay ? startDay : start.toISOString();
  const common = { datetime, severalDays };
  const time = event.allDay ? undefined : format('time').format(start);
  const day = severalDays
    ? {
        weekday: format('weekday').formatRange(start, end),
        // Within one year as compact as `13.–15.03.`. Across the turn of the year the range of
        // `Intl` would repeat the years, which the line below already shows.
        dayMonth:
          format('year').format(start) === format('year').format(end)
            ? format('dayMonth').formatRange(start, end)
            : `${format('dayMonth').format(start)} – ${format('dayMonth').format(end)}`,
        year: format('year').formatRange(start, end),
      }
    : {
        weekday: format('weekday').format(start),
        dayMonth: format('dayMonth').format(start),
        year: format('year').format(start),
      };
  return time === undefined ? { ...day, ...common } : { ...day, time, ...common };
}
