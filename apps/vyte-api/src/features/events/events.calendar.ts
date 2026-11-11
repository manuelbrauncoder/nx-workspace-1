import { localDate } from './events.time.js';

interface CalendarEvent {
  id: string;
  title: string;
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  timeZone: string;
  /** What goes into LOCATION; the save-the-date file leaves the address out. */
  location: string | null;
}

/** Text of a property value: backslash, comma, semicolon and line breaks escaped (RFC 5545 3.3.11). */
function text(value: string): string {
  return (
    value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n|\u0085|\u2028|\u2029/g, '\\n')
      // no other control characters: they have no place in a calendar line
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
  );
}

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 3.1). */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (octets + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const pad = (value: number) => String(value).padStart(2, '0');

/** `20270314T180000Z` */
function utc(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** `20270314`, the local day of the instant in the event's time zone. */
function day(instant: Date, timeZone: string, addDays = 0): string {
  const { year, month, day: dayOfMonth } = localDate(instant, timeZone);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth + addDays));
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

/**
 * A calendar file with the one event. Timed events in UTC; all-day events as dates in the
 * event's time zone, the end exclusive (the day after the last day).
 */
export function calendarFile(event: CalendarEvent, now = new Date()): string {
  const times = event.allDay
    ? [
        `DTSTART;VALUE=DATE:${day(event.startsAt, event.timeZone)}`,
        `DTEND;VALUE=DATE:${day(event.endsAt ?? event.startsAt, event.timeZone, 1)}`,
      ]
    : [`DTSTART:${utc(event.startsAt)}`, ...(event.endsAt ? [`DTEND:${utc(event.endsAt)}`] : [])];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vyte//vyte-api//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@vyte`,
    `DTSTAMP:${utc(now)}`,
    ...times,
    `SUMMARY:${text(event.title)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Location of the invitation: name and address. */
export function fullLocation(event: { locationName: string | null; address: string | null }) {
  return [event.locationName, event.address].filter(Boolean).join(', ') || null;
}
