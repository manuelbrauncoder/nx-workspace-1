import { VyteEvent } from './event';
import {
  emptyEventFormModel,
  EventFormModel,
  toEventDraft,
  toEventFormModel,
  toEventTimes,
} from './event-times';

const day = (month: number, date: number) => new Date(2027, month - 1, date);
const at = (month: number, date: number, hours: number, minutes = 0) =>
  new Date(2027, month - 1, date, hours, minutes);

const model = (changes: Partial<EventFormModel>): EventFormModel => ({
  ...emptyEventFormModel(),
  title: 'Sommerfest',
  startDate: day(3, 14),
  startTime: '19:00',
  ...changes,
});

const event = (changes: Partial<VyteEvent>): VyteEvent =>
  ({
    id: 'e1',
    title: 'Sommerfest',
    description: '',
    locationName: null,
    address: null,
    allDay: false,
    startsAt: new Date('2027-03-14T18:00:00.000Z'),
    endsAt: null,
    timeZone: 'Europe/Berlin',
    rsvpDeadline: null,
    ...changes,
  }) as VyteEvent;

describe('toEventTimes', () => {
  it('is undefined while the start is incomplete', () => {
    expect(toEventTimes(model({ startDate: null }))).toBeUndefined();
    expect(toEventTimes(model({ startTime: '' }))).toBeUndefined();
  });

  it('combines the day and the time of the start', () => {
    expect(toEventTimes(model({}))).toEqual({
      startsAt: at(3, 14, 19),
      endsAt: null,
      rsvpDeadline: null,
    });
  });

  it('puts an end without a date on the day of the start', () => {
    expect(toEventTimes(model({ endTime: '23:30' }))?.endsAt).toEqual(at(3, 14, 23, 30));
  });

  it('puts an earlier end time without a date on the next day', () => {
    expect(toEventTimes(model({ endTime: '02:00' }))?.endsAt).toEqual(at(3, 15, 2));
  });

  it('takes the date of the end when there is one', () => {
    expect(toEventTimes(model({ endDate: day(3, 16), endTime: '12:00' }))?.endsAt).toEqual(
      at(3, 16, 12),
    );
  });

  it('keeps the wall clock time on the day the clocks change', () => {
    expect(toEventTimes(model({ startDate: day(3, 28), startTime: '19:00' }))?.startsAt).toEqual(
      at(3, 28, 19),
    );
  });

  it('uses midnight of the first and the last day for an all-day event', () => {
    expect(
      toEventTimes(model({ allDay: true, startTime: '', endDate: day(3, 15), endTime: '10:00' })),
    ).toEqual({ startsAt: day(3, 14), endsAt: day(3, 15), rsvpDeadline: null });
  });

  it('keeps answers open until the end of the day of the deadline', () => {
    expect(toEventTimes(model({ deadlineDate: day(3, 1) }))?.rsvpDeadline).toEqual(
      at(3, 1, 23, 59),
    );
  });
});

describe('toEventDraft', () => {
  it('builds the draft with the given time zone', () => {
    expect(toEventDraft(model({ locationName: 'Mühle' }), 'Europe/Berlin')).toEqual({
      title: 'Sommerfest',
      description: '',
      locationName: 'Mühle',
      address: '',
      allDay: false,
      startsAt: at(3, 14, 19),
      endsAt: null,
      rsvpDeadline: null,
      timeZone: 'Europe/Berlin',
    });
  });

  it('refuses a form without a complete start', () => {
    expect(() => toEventDraft(model({ startDate: null }), 'Europe/Berlin')).toThrow();
  });
});

describe('toEventFormModel', () => {
  it('reads day and time in the zone of the event, also in summer', () => {
    expect(toEventFormModel(event({}))).toMatchObject({
      startDate: day(3, 14),
      startTime: '19:00',
    });
    expect(
      toEventFormModel(event({ startsAt: new Date('2027-07-14T17:00:00.000Z') })),
    ).toMatchObject({ startDate: day(7, 14), startTime: '19:00' });
  });

  it('leaves out the date of an end on the same day or overnight', () => {
    expect(toEventFormModel(event({ endsAt: new Date('2027-03-14T22:30:00.000Z') }))).toMatchObject(
      { endDate: null, endTime: '23:30' },
    );
    expect(toEventFormModel(event({ endsAt: new Date('2027-03-15T01:00:00.000Z') }))).toMatchObject(
      { endDate: null, endTime: '02:00' },
    );
  });

  it('keeps the date of a later end', () => {
    expect(toEventFormModel(event({ endsAt: new Date('2027-03-16T11:00:00.000Z') }))).toMatchObject(
      { endDate: day(3, 16), endTime: '12:00' },
    );
  });

  it('shows an all-day event with dates only and turns empty texts into strings', () => {
    expect(
      toEventFormModel(
        event({
          allDay: true,
          startsAt: new Date('2027-03-13T23:00:00.000Z'),
          endsAt: new Date('2027-03-14T23:00:00.000Z'),
          rsvpDeadline: new Date('2027-03-01T22:59:00.000Z'),
        }),
      ),
    ).toEqual({
      ...emptyEventFormModel(),
      title: 'Sommerfest',
      allDay: true,
      startDate: day(3, 14),
      endDate: day(3, 15),
      deadlineDate: day(3, 1),
    });
  });
});
