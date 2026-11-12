import { EventDraft, VyteEvent } from './event';

/** What the event form edits. Dates come from the date picker, times are `'HH:MM'` or `''`. */
export interface EventFormModel {
  title: string;
  description: string;
  locationName: string;
  address: string;
  allDay: boolean;
  startDate: Date | null;
  startTime: string;
  /** Empty: the end is on the day of the start, or the next day when the end time is earlier. */
  endDate: Date | null;
  endTime: string;
  /** Answers are open until the end of this day. */
  deadlineDate: Date | null;
}

export interface EventTimes {
  startsAt: Date;
  endsAt: Date | null;
  rsvpDeadline: Date | null;
}

export function emptyEventFormModel(): EventFormModel {
  return {
    title: '',
    description: '',
    locationName: '',
    address: '',
    allDay: false,
    startDate: null,
    startTime: '',
    endDate: null,
    endTime: '',
    deadlineDate: null,
  };
}

/**
 * The instants of the form, or `undefined` while the start is incomplete. They are built in the
 * zone of the browser, which is also the zone stored with the event: vyte is used in one country,
 * so the host's browser and the place of the event share it.
 */
export function toEventTimes(model: EventFormModel): EventTimes | undefined {
  if (!model.startDate || (!model.allDay && !model.startTime)) {
    return undefined;
  }
  if (model.allDay) {
    // The API keeps all-day events as midnight of the first and the last day.
    return {
      startsAt: startOfDay(model.startDate),
      endsAt: model.endDate ? startOfDay(model.endDate) : null,
      rsvpDeadline: deadline(model.deadlineDate),
    };
  }
  const startsAt = atTime(model.startDate, model.startTime);
  let endsAt: Date | null = null;
  if (model.endTime) {
    endsAt = atTime(model.endDate ?? model.startDate, model.endTime);
    // "19 bis 2 Uhr": without a date of its own, an earlier end time is on the next day.
    if (!model.endDate && endsAt < startsAt) {
      endsAt = atTime(addDays(model.startDate, 1), model.endTime);
    }
  }
  return { startsAt, endsAt, rsvpDeadline: deadline(model.deadlineDate) };
}

/** The draft to save. Call it only for a form whose start is complete, the validators ensure it. */
export function toEventDraft(model: EventFormModel, timeZone: string): EventDraft {
  const times = toEventTimes(model);
  if (!times) {
    throw new Error('The start of the event is missing');
  }
  return {
    title: model.title,
    description: model.description,
    locationName: model.locationName,
    address: model.address,
    allDay: model.allDay,
    ...times,
    timeZone,
  };
}

/**
 * The form of a stored event. Read in the zone of the event, so the server, which runs in UTC,
 * renders the same values as the browser.
 */
export function toEventFormModel(event: VyteEvent): EventFormModel {
  const start = partsIn(event.startsAt, event.timeZone);
  const end = event.endsAt ? partsIn(event.endsAt, event.timeZone) : undefined;
  const sameDay = end?.date.getTime() === start.date.getTime();
  // Keep "19 bis 2 Uhr" without an end date, as it was entered.
  const overnight =
    !event.allDay &&
    end !== undefined &&
    end.date.getTime() === addDays(start.date, 1).getTime() &&
    end.time < start.time;
  return {
    title: event.title,
    description: event.description,
    locationName: event.locationName ?? '',
    address: event.address ?? '',
    allDay: event.allDay,
    startDate: start.date,
    startTime: event.allDay ? '' : start.time,
    endDate: end && (event.allDay || !(sameDay || overnight)) ? end.date : null,
    endTime: end && !event.allDay ? end.time : '',
    deadlineDate: event.rsvpDeadline ? partsIn(event.rsvpDeadline, event.timeZone).date : null,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function atTime(date: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

/** The last minute of the day: answers on that day still count. */
function deadline(date: Date | null): Date | null {
  return date ? atTime(date, '23:59') : null;
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

/** Day and time of an instant in a zone. The day comes back as local midnight for the date picker. */
function partsIn(instant: Date, timeZone: string): { date: Date; time: string } {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    partFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    date: new Date(Number(parts['year']), Number(parts['month']) - 1, Number(parts['day'])),
    time: `${parts['hour']}:${parts['minute']}`,
  };
}

/** The zone of the browser, stored with a new event. Read only in the browser, the server runs in UTC. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
