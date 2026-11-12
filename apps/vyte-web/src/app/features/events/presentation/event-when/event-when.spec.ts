import { TestBed } from '@angular/core/testing';
import { I18nService } from '@core/i18n/i18n.service';
import { describeEventTime, EventTimeFields } from './event-when';

const event = (changes: Partial<EventTimeFields>): EventTimeFields => ({
  allDay: false,
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  ...changes,
});

describe('describeEventTime', () => {
  const text = (changes: Partial<EventTimeFields>) =>
    describeEventTime(event(changes), TestBed.inject(I18nService));

  it('names day and time in the zone of the event', () => {
    expect(text({})).toBe('So., 14. März 2027, 19:00 Uhr');
  });

  it('shows an evening that ends after midnight as one range', () => {
    expect(text({ endsAt: new Date('2027-03-15T01:00:00.000Z') })).toBe(
      'So., 14. März 2027, 19:00 bis 02:00 Uhr',
    );
  });

  it('names both days of a longer event', () => {
    expect(text({ endsAt: new Date('2027-03-16T11:00:00.000Z') })).toBe(
      'So., 14. März 2027, 19:00 bis Di., 16. März 2027, 12:00',
    );
  });

  it('shows an all-day event with dates only', () => {
    const allDay = { allDay: true, startsAt: new Date('2027-03-13T23:00:00.000Z') };

    expect(text(allDay)).toBe('So., 14. März 2027, ganztägig');
    expect(text({ ...allDay, endsAt: new Date('2027-03-14T23:00:00.000Z') })).toBe(
      'So., 14. März 2027 bis Mo., 15. März 2027',
    );
  });
});
