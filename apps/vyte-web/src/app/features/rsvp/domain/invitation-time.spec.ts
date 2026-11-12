import { hostNames, invitationTime, InvitationTimeFields } from './invitation-time';

const berlin = (overrides: Partial<InvitationTimeFields>): InvitationTimeFields => ({
  allDay: false,
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  ...overrides,
});

describe('invitationTime', () => {
  it('shows only the start time without an end', () => {
    const time = invitationTime(berlin({}), 'de-DE');

    expect(time).toEqual({ date: { start: 'Sa., 13. März 2027' }, time: { start: '19:00' } });
  });

  it('shows start and end time of an evening', () => {
    const time = invitationTime(berlin({ endsAt: new Date('2027-03-13T22:00:00.000Z') }), 'de-DE');

    expect(time).toEqual({
      date: { start: 'Sa., 13. März 2027' },
      time: { start: '19:00', end: '23:00' },
    });
  });

  it('keeps one evening across midnight as one date with a time range', () => {
    const time = invitationTime(berlin({ endsAt: new Date('2027-03-14T01:00:00.000Z') }), 'de-DE');

    expect(time.date).toEqual({ start: 'Sa., 13. März 2027' });
    expect(time.time).toEqual({ start: '19:00', end: '02:00' });
  });

  it('gives a single date and no time for an all-day event', () => {
    const time = invitationTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-03-12T23:00:00.000Z'),
        endsAt: new Date('2027-03-12T23:00:00.000Z'),
      }),
      'de-DE',
    );

    expect(time).toEqual({ date: { start: 'Sa., 13. März 2027' } });
  });

  it('gives the first and the last day of an all-day event over several days', () => {
    const time = invitationTime(
      berlin({
        allDay: true,
        startsAt: new Date('2027-03-12T23:00:00.000Z'),
        endsAt: new Date('2027-03-14T23:00:00.000Z'),
      }),
      'de-DE',
    );

    expect(time).toEqual({ date: { start: 'Sa., 13. März 2027', end: 'Mo., 15. März 2027' } });
  });

  it('gives both days for a timed event of a day or more', () => {
    const time = invitationTime(berlin({ endsAt: new Date('2027-03-14T18:00:00.000Z') }), 'de-DE');

    expect(time.date).toEqual({ start: 'Sa., 13. März 2027', end: 'So., 14. März 2027' });
    expect(time.time).toEqual({ start: '19:00', end: '19:00' });
  });

  it('renders in the zone of the event, not in the zone of the runner', () => {
    // 23:30 UTC is already the next day in Berlin (winter time, UTC+1) but not in New York.
    const startsAt = new Date('2027-01-10T23:30:00.000Z');

    const inBerlin = invitationTime(berlin({ startsAt }), 'de-DE');
    const inNewYork = invitationTime(berlin({ startsAt, timeZone: 'America/New_York' }), 'de-DE');

    expect(inBerlin).toEqual({ date: { start: 'Mo., 11. Januar 2027' }, time: { start: '00:30' } });
    expect(inNewYork).toEqual({
      date: { start: 'So., 10. Januar 2027' },
      time: { start: '18:30' },
    });
  });

  it('follows the summer time of the zone', () => {
    const time = invitationTime(
      berlin({ startsAt: new Date('2027-07-10T17:00:00.000Z') }),
      'de-DE',
    );

    expect(time.time).toEqual({ start: '19:00' });
  });
});

describe('hostNames', () => {
  it('gives one name as it is', () => {
    expect(hostNames(['Anna'], 'de-DE')).toBe('Anna');
  });

  it('joins two names in German', () => {
    expect(hostNames(['Anna', 'Jonas'], 'de-DE')).toBe('Anna und Jonas');
  });

  it('joins several names in German', () => {
    expect(hostNames(['Anna', 'Ben', 'Jonas'], 'de-DE')).toBe('Anna, Ben und Jonas');
  });

  it('joins names in English', () => {
    expect(hostNames(['Anna', 'Jonas'], 'en-GB')).toBe('Anna and Jonas');
    expect(hostNames(['Anna', 'Ben', 'Jonas'], 'en-GB')).toBe('Anna, Ben and Jonas');
  });

  it('gives an empty text for no host', () => {
    expect(hostNames([], 'de-DE')).toBe('');
  });
});
