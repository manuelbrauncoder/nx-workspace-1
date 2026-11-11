/** Milliseconds the wall clock of `timeZone` is ahead of UTC at `instant`. */
function offsetMs(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  );
  const wall = Date.UTC(
    parts['year']!,
    parts['month']! - 1,
    parts['day']!,
    parts['hour']!,
    parts['minute']!,
    parts['second']!,
  );
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant the wall clock of `timeZone` shows midnight of the given local date. */
function localMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month, day);
  // twice, so a change of the offset between the guess and the result (summer time) is taken in
  const first = guess - offsetMs(new Date(guess), timeZone);
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

/** The local date of `instant` in `timeZone`, month 1–12. */
export function localDate(instant: Date, timeZone: string) {
  const local = new Date(instant.getTime() + offsetMs(instant, timeZone));
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
  };
}

/** The next midnight in `timeZone` after `instant`: the end of its local day. */
export function endOfLocalDay(instant: Date, timeZone: string): Date {
  const local = new Date(instant.getTime() + offsetMs(instant, timeZone));
  return localMidnight(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
    timeZone,
  );
}

interface EventTimes {
  allDay: boolean;
  startsAt: Date;
  endsAt: Date | null;
  timeZone: string;
}

/**
 * When an event is over: at `endsAt`; for an all-day event at the end of its last day; without
 * an end at the end of the day it starts, all in the event's time zone.
 */
export function eventEnd(event: EventTimes): Date {
  if (event.endsAt && !event.allDay) return event.endsAt;
  return endOfLocalDay(event.endsAt ?? event.startsAt, event.timeZone);
}

export function isPast(event: EventTimes, now = new Date()): boolean {
  return now >= eventEnd(event);
}
