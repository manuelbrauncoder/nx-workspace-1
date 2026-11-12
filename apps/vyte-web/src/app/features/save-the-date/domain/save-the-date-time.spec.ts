import { saveTheDateTime, SaveTheDateTimeFields } from './save-the-date-time';

const berlin = (overrides: Partial<SaveTheDateTimeFields>): SaveTheDateTimeFields => ({
  allDay: false,
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  ...overrides,
});

// `Intl` puts thin spaces around the dash of a range.
const DASH = ' – ';

describe('saveTheDateTime', () => {
  it('gives weekday, day and month, year and time of an evening', () => {
    expect(saveTheDateTime(berlin({}), 'de-DE')).toEqual({
      weekday: 'Samstag',
      dayMonth: '13.03.',
      year: '2027',
      time: '19:00',
      datetime: '2027-03-13T18:00:00.000Z',
      severalDays: false,
    });
  });

  it('writes the parts in English', () => {
    expect(saveTheDateTime(berlin({}), 'en-GB')).toMatchObject({
      weekday: 'Saturday',
      dayMonth: '13/03',
      year: '2027',
      time: '19:00',
    });
  });

  it('keeps one evening across midnight as one day', () => {
    const time = saveTheDateTime(berlin({ endsAt: new Date('2027-03-14T01:00:00.000Z') }), 'de-DE');

    expect(time).toMatchObject({ weekday: 'Samstag', dayMonth: '13.03.', severalDays: false });
  });

  it('gives no time and the day as datetime for an all-day event', () => {
    const time = saveTheDateTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-03-12T23:00:00.000Z'),
        endsAt: new Date('2027-03-12T23:00:00.000Z'),
      }),
      'de-DE',
    );

    expect(time).toEqual({
      weekday: 'Samstag',
      dayMonth: '13.03.',
      year: '2027',
      datetime: '2027-03-13',
      severalDays: false,
    });
  });

  it('gives a range for an all-day event over several days', () => {
    const time = saveTheDateTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-03-12T23:00:00.000Z'),
        endsAt: new Date('2027-03-14T23:00:00.000Z'),
      }),
      'de-DE',
    );

    expect(time).toEqual({
      weekday: `Samstag${DASH}Montag`,
      dayMonth: '13.–15.03.',
      year: '2027',
      datetime: '2027-03-13',
      severalDays: true,
    });
  });

  it('gives a range for a timed event of a day or more, with the start time', () => {
    const time = saveTheDateTime(berlin({ endsAt: new Date('2027-03-14T18:00:00.000Z') }), 'de-DE');

    expect(time).toMatchObject({
      weekday: `Samstag${DASH}Sonntag`,
      dayMonth: '13.–14.03.',
      time: '19:00',
      severalDays: true,
    });
  });

  it('names both years across the turn of the year without repeating them', () => {
    const time = saveTheDateTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-12-30T23:00:00.000Z'),
        endsAt: new Date('2028-01-01T23:00:00.000Z'),
      }),
      'de-DE',
    );

    expect(time).toMatchObject({ dayMonth: '31.12. – 02.01.', year: '2027–2028' });
  });

  it('renders in the zone of the event, not in the zone of the runner', () => {
    // 23:30 UTC is already the next day in Berlin (winter time, UTC+1) but not in New York.
    const startsAt = new Date('2027-01-10T23:30:00.000Z');

    expect(saveTheDateTime(berlin({ startsAt }), 'de-DE')).toMatchObject({
      weekday: 'Montag',
      dayMonth: '11.01.',
      time: '00:30',
    });
    expect(
      saveTheDateTime(berlin({ startsAt, timeZone: 'America/New_York' }), 'de-DE'),
    ).toMatchObject({ weekday: 'Sonntag', dayMonth: '10.01.', time: '18:30' });
  });

  it('takes the day of an all-day event from its zone', () => {
    // Midnight in Tokyo is still the day before in UTC.
    const time = saveTheDateTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-03-12T15:00:00.000Z'),
        endsAt: null,
        timeZone: 'Asia/Tokyo',
      }),
      'de-DE',
    );

    expect(time).toMatchObject({ dayMonth: '13.03.', datetime: '2027-03-13' });
  });

  it('follows the summer time of the zone', () => {
    const time = saveTheDateTime(
      berlin({ startsAt: new Date('2027-07-10T17:00:00.000Z') }),
      'de-DE',
    );

    expect(time.time).toBe('19:00');
  });
});
