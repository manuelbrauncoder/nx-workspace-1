import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, loading, success } from '@core/state/async-state';
import { SaveTheDateStore } from '../../application/save-the-date.store';
import { SaveTheDate, UpcomingSaveTheDate } from '../../domain/save-the-date';
import { SaveTheDatePage } from './save-the-date-page';
import { saveTheDatePageI18n } from './save-the-date-page.i18n';

const UPCOMING: UpcomingSaveTheDate = {
  past: false,
  title: 'Anna wird 30',
  allDay: false,
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  locationName: 'Gartenhaus am See',
  note: 'Haltet euch den Abend frei!',
  cover: { width: 1600, height: 900 },
};

const upcoming = (overrides: Partial<UpcomingSaveTheDate> = {}): UpcomingSaveTheDate => ({
  ...UPCOMING,
  ...overrides,
});

describe('SaveTheDatePage', () => {
  const select = vi.fn();
  const reload = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  async function render(current: SaveTheDate | undefined, state?: AsyncState) {
    const response: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SaveTheDateStore,
          useValue: {
            select,
            reload,
            saveTheDate: signal(current),
            saveTheDateState: signal(state ?? (current ? success() : loading())),
            coverUrl: () => 'https://api.example.com/save-the-date/tok/cover',
            calendarUrl: () => 'https://api.example.com/save-the-date/tok/calendar',
          },
        },
        { provide: RESPONSE_INIT, useValue: response },
        // The cover comes from the API, the app sets no preconnect for a test host.
        { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://api.example.com' },
      ],
    });
    await loadI18nScopes(saveTheDatePageI18n);
    const fixture = TestBed.createComponent(SaveTheDatePage);
    fixture.componentRef.setInput('token', 'tok');
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, response };
  }

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.trim();
  const heading = (element: HTMLElement) => text(element, 'h1');
  const buttonWith = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label),
    );

  it('selects the token of the route', async () => {
    await render(undefined);

    expect(select).toHaveBeenCalledWith('tok');
  });

  describe('upcoming event', () => {
    it('shows badge, title, cover, date card, note and the calendar link', async () => {
      const { element, response } = await render(upcoming());

      expect(text(element, '.save-the-date__badge')).toBe('Save the Date');
      expect(heading(element)).toBe('Anna wird 30');
      const cover = element.querySelector('.save-the-date__cover img');
      expect(cover?.getAttribute('src')).toBe('https://api.example.com/save-the-date/tok/cover');
      expect(cover?.getAttribute('alt')).toBe('');
      expect(text(element, '.save-the-date__weekday')).toBe('Samstag');
      expect(text(element, '.save-the-date__day')).toBe('13.03.');
      expect(text(element, '.save-the-date__year')).toBe('2027');
      expect(text(element, '.save-the-date__time')).toBe('19:00 Uhr');
      expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
        '2027-03-13T18:00:00.000Z',
      );
      expect(text(element, '.save-the-date__location')).toBe('Gartenhaus am See');
      expect(text(element, '.save-the-date__note')).toBe('Haltet euch den Abend frei!');
      const calendar = element.querySelector<HTMLAnchorElement>('a[download]');
      expect(calendar?.textContent?.trim()).toBe('Zum Kalender hinzufügen');
      expect(calendar?.getAttribute('href')).toBe(
        'https://api.example.com/save-the-date/tok/calendar',
      );
      expect(response.status).toBeUndefined();
    });

    it('says the invitation follows without a note of the hosts', async () => {
      const { element } = await render(upcoming({ note: null }));

      expect(text(element, '.save-the-date__note')).toBe(
        'Halte dir den Termin frei, die Einladung folgt.',
      );
    });

    it('leaves out cover and place when the event has none', async () => {
      const { element } = await render(upcoming({ cover: null, locationName: null }));

      expect(element.querySelector('img')).toBeNull();
      expect(element.querySelector('.save-the-date__location')).toBeNull();
    });

    it('shows an all-day event without a time', async () => {
      const { element } = await render(
        upcoming({
          allDay: true,
          startsAt: new Date('2027-03-12T23:00:00.000Z'),
          endsAt: new Date('2027-03-12T23:00:00.000Z'),
        }),
      );

      expect(text(element, '.save-the-date__day')).toBe('13.03.');
      expect(element.querySelector('.save-the-date__time')).toBeNull();
      expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2027-03-13');
    });

    it('shows the first and the last day of an event over several days', async () => {
      const { element } = await render(
        upcoming({
          allDay: true,
          startsAt: new Date('2027-03-12T23:00:00.000Z'),
          endsAt: new Date('2027-03-14T23:00:00.000Z'),
        }),
      );

      expect(text(element, '.save-the-date__weekday')).toBe('Samstag – Montag');
      expect(text(element, '.save-the-date__day')).toBe('13.–15.03.');
      expect(element.querySelector('.save-the-date__day--range')).not.toBeNull();
      expect(element.querySelector('.save-the-date__time')).toBeNull();
    });
  });

  describe('past event', () => {
    it('shows only the title and that the event is over', async () => {
      const { element } = await render({ past: true, title: 'Anna wird 30' });

      expect(text(element, '.save-the-date__kicker')).toBe('Anna wird 30');
      expect(heading(element)).toBe('Das Event ist vorbei');
      expect(element.textContent).toContain('Diese Ankündigung ist nicht mehr aktiv.');
      expect(element.querySelector('time')).toBeNull();
      expect(element.querySelector('img')).toBeNull();
      expect(element.querySelector('a[download]')).toBeNull();
    });
  });

  describe('loading and failures', () => {
    it('shows the plain heading while loading', async () => {
      const { element } = await render(undefined);

      expect(heading(element)).toBe('Save the Date');
      expect(element.querySelector('a[download]')).toBeNull();
      await expect(element).toBeAccessible();
    });

    it('says the page was not found with status 404, without a retry', async () => {
      const { element, response } = await render(
        undefined,
        failed(new Failure('not-found', 'Unknown token')),
      );

      expect(heading(element)).toBe('Nicht gefunden');
      expect(element.textContent).toContain('Der Link ist nicht mehr gültig');
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(buttonWith(element, 'Erneut versuchen')).toBeUndefined();
      expect(response.status).toBe(404);
    });

    it('offers a retry for another failure that reloads', async () => {
      const { element, response } = await render(undefined, failed(new Failure('server', 'Down')));

      expect(heading(element)).toBe('Save the Date');
      expect(element.textContent).toContain('Die Seite konnte nicht geladen werden');
      await expect(element).toBeAccessible();
      buttonWith(element, 'Erneut versuchen')!.click();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(response.status).not.toBe(404);
    });
  });

  describe('accessibility', () => {
    it('has no violations for an upcoming event', async () => {
      const { element } = await render(upcoming());

      await expect(element).toBeAccessible();
    });

    it('has no violations for an all-day event over several days', async () => {
      const { element } = await render(
        upcoming({
          allDay: true,
          note: null,
          startsAt: new Date('2027-03-12T23:00:00.000Z'),
          endsAt: new Date('2027-03-14T23:00:00.000Z'),
        }),
      );

      await expect(element).toBeAccessible();
    });

    it('has no violations for a past event', async () => {
      const { element } = await render({ past: true, title: 'Anna wird 30' });

      await expect(element).toBeAccessible();
    });

    it('has no violations for not found', async () => {
      const { element } = await render(
        undefined,
        failed(new Failure('not-found', 'Unknown token')),
      );

      await expect(element).toBeAccessible();
    });
  });
});
