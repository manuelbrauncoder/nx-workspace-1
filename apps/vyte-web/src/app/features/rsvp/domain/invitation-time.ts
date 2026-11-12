import { formatLocalDate } from '@core/i18n/local-date';
import { InvitationEvent } from './invitation';

export type InvitationTimeFields = Pick<
  InvitationEvent,
  'allDay' | 'startsAt' | 'endsAt' | 'timeZone'
>;

/** The parts of the time of an event, each for a chip of the guest page. */
export interface InvitationTime {
  /** `Sa., 14. März 2027`, or the first and last day of an event over several days. */
  date: { start: string; end?: string };
  /** `19:00` and `02:00`, or only the start. Without times for an all-day event. */
  time?: { start: string; end?: string };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Date and time of an event in its own zone, so the server (UTC) and every browser render the
 * same. An evening that ends after midnight stays one day ("19:00 bis 02:00 Uhr").
 */
export function invitationTime(event: InvitationTimeFields, locale: string): InvitationTime {
  const format = (date: Date, as: 'weekdayDate' | 'time' | 'date') =>
    formatLocalDate(date, locale, as, event.timeZone);
  const { startsAt: start, endsAt: end } = event;
  const otherDay = end !== null && format(end, 'date') !== format(start, 'date');
  const severalDays = otherDay && (event.allDay || end.getTime() - start.getTime() >= DAY);

  const date = severalDays
    ? { start: format(start, 'weekdayDate'), end: format(end, 'weekdayDate') }
    : { start: format(start, 'weekdayDate') };
  if (event.allDay) {
    return { date };
  }
  return {
    date,
    time: end
      ? { start: format(start, 'time'), end: format(end, 'time') }
      : { start: format(start, 'time') },
  };
}

/** The hosts as one phrase in the language: "Anna und Jonas", "Anna, Ben und Jonas". */
export function hostNames(hosts: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(hosts);
}
