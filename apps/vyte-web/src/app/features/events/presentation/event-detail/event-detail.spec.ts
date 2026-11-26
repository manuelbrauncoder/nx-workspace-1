import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { EventDetail } from './event-detail';
import { eventDetailI18n } from './event-detail.i18n';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  description: '<p>Kommt vorbei</p>',
  locationName: 'Alte Mühle',
  address: 'Mühlweg 1\n12345 Musterstadt',
  allDay: false,
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: new Date('2027-03-01T22:59:00.000Z'),
  role: 'owner',
  past: false,
  images: [
    {
      id: 'i1',
      url: 'https://api.example.com/events/e1/images/i1',
      width: 1600,
      height: 900,
      position: 0,
    },
  ],
  counts: { invited: 3, coming: 4, declined: 1, pending: 1, atMost: 6 },
  saveTheDate: null,
  photoStand: null,
  createdAt: new Date('2026-11-11T09:00:00.000Z'),
  updatedAt: new Date('2026-11-11T09:00:00.000Z'),
} as VyteEvent;

describe('EventDetail', () => {
  const select = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  async function render(state: AsyncState, event?: VyteEvent) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EventsStore,
          useValue: {
            select,
            selected: signal(event),
            detailState: signal(state),
            mutationState: signal(idle()),
            saveTheDateState: signal(idle()),
            photoStandState: signal(idle()),
          },
        },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
      ],
    });
    await loadI18nScopes(eventDetailI18n);
    const fixture = TestBed.createComponent(EventDetail);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('leaves selecting the event to the frame', async () => {
    await render(loading());

    expect(select).not.toHaveBeenCalled();
  });

  it('has no heading, breadcrumb or actions of its own', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('a[href="/events/e1/edit"]')).toBeNull();
    expect(element.querySelector('a[href="/events/e1/print"]')).toBeNull();
  });

  it('shows address with a link to the map and the deadline in the zone of the event', async () => {
    const element = await render(success(), EVENT);

    const glance = element.querySelector('#event-detail-glance')!.closest('section')!;
    expect(glance.querySelector('.event-detail__address')?.textContent).toContain('Mühlweg 1');
    expect(glance.querySelectorAll('[appUiSeparator]')).toHaveLength(2);
    expect(element.textContent).toContain('Mo., 1. März 2027');
    const map = element.querySelector('.event-detail__map');
    expect(map?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/search?query=M%C3%BChlweg%201%0A12345%20Musterstadt',
    );
    expect(map?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows neither address nor deadline fact, and only the line before the links, without both', async () => {
    const element = await render(success(), { ...EVENT, address: null, rsvpDeadline: null });

    expect(element.querySelector('.event-detail__address')).toBeNull();
    expect(element.querySelector('.event-detail__map[target]')).toBeNull();
    expect(element.querySelector('time')).toBeNull();
    expect(element.querySelectorAll('.event-detail__glance [appUiSeparator]')).toHaveLength(1);
    expect(element.querySelectorAll('dl.event-detail__facts')).toHaveLength(1);
  });

  it('shows only the deadline when there is no address', async () => {
    const element = await render(success(), { ...EVENT, address: null });

    expect(element.querySelector('.event-detail__address')).toBeNull();
    expect(element.querySelector('.event-detail__map[target]')).toBeNull();
    expect(element.querySelector('time')).not.toBeNull();
  });

  it('shows only the address when there is no deadline', async () => {
    const element = await render(success(), { ...EVENT, rsvpDeadline: null });

    expect(element.querySelector('.event-detail__map[target]')).not.toBeNull();
    expect(element.querySelector('time')).toBeNull();
  });

  it('shows the counts at a glance and no link to the guest list', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('h2#event-detail-glance')?.textContent?.trim()).toBe(
      'Auf einen Blick',
    );
    const entries = Array.from(
      element.querySelectorAll('dl.event-detail__counts > div'),
      (entry) => [
        entry.querySelector('dt')?.textContent?.trim(),
        entry.querySelector('dd')?.textContent?.trim(),
      ],
    );
    expect(entries).toEqual([
      ['Kommen', '4'],
      ['Eingeladen', '3'],
      ['Höchstens', '6'],
    ]);
    expect(element.querySelector('.event-detail__counts > .event-detail__coming')).not.toBeNull();
    expect(element.querySelectorAll('.event-detail__counts .event-detail__count')).toHaveLength(2);
    expect(element.querySelector('a[href="/events/e1/guests"]')).toBeNull();
  });

  it('splits the guests by answer in the legend of the bar', async () => {
    const element = await render(success(), EVENT);

    const legend = Array.from(
      element.querySelectorAll('app-ui-stacked-bar .ui-stacked-bar__item'),
      (item) => item.textContent?.replace(/\s+/g, ' ').trim(),
    );
    // invited 3, declined 1, pending 1: one guest accepted.
    expect(legend).toEqual(['Zusagen 1', 'Absagen 1', 'Offen 1']);
  });

  it('counts the accepted guests as invited minus declined and pending', async () => {
    const element = await render(success(), {
      ...EVENT,
      counts: { invited: 10, coming: 14, declined: 2, pending: 3, atMost: 20 },
    });

    const legend = Array.from(
      element.querySelectorAll('app-ui-stacked-bar .ui-stacked-bar__item'),
      (item) => item.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(legend).toEqual(['Zusagen 5', 'Absagen 2', 'Offen 3']);
  });

  it('shows the description as rich text', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('#event-detail-description')?.textContent?.trim()).toBe(
      'Beschreibung',
    );
    expect(element.querySelector('app-ui-rich-text')?.textContent).toContain('Kommt vorbei');
  });

  it('says so when there is no description', async () => {
    const element = await render(success(), { ...EVENT, description: '' });

    expect(element.querySelector('app-ui-rich-text')).toBeNull();
    expect(element.textContent).toContain('Keine Beschreibung');
  });

  it('links to the edit page to add a description while the event is upcoming', async () => {
    const element = await render(success(), { ...EVENT, description: '' });

    const link = element.querySelector('.event-detail__description--empty a');
    expect(link?.textContent?.trim()).toBe('Beschreibung hinzufügen');
    expect(link?.getAttribute('href')).toBe('/events/e1/edit');
  });

  it('offers no link to add a description once the event is past', async () => {
    const element = await render(success(), { ...EVENT, description: '', past: true });

    expect(element.textContent).toContain('Keine Beschreibung');
    expect(element.querySelector('.event-detail__description--empty a')).toBeNull();
    expect(element.textContent).not.toContain('Beschreibung hinzufügen');
  });

  it('offers no link to add a description when there is one', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('a[href="/events/e1/edit"]')).toBeNull();
  });

  it('shows the images section only with images, behind a line', async () => {
    const withImages = await render(success(), EVENT);
    expect(withImages.querySelector('#event-detail-images')).not.toBeNull();
    expect(withImages.querySelectorAll('app-ui-attachment')).toHaveLength(1);
    expect(withImages.querySelectorAll('.event-detail__main > [appUiSeparator]')).toHaveLength(1);

    TestBed.resetTestingModule();
    const without = await render(success(), { ...EVENT, images: [] });
    expect(without.querySelector('#event-detail-images')).toBeNull();
    expect(without.querySelector('.event-detail__main > [appUiSeparator]')).toBeNull();
  });

  it('has no share section and no panels any more', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('#event-detail-share')).toBeNull();
    expect(element.querySelector('app-save-the-date-panel')).toBeNull();
    expect(element.querySelector('app-photo-stand-panel')).toBeNull();
  });

  describe('status of the public links', () => {
    const rows = (element: HTMLElement) =>
      Array.from(
        element.querySelectorAll(
          '.event-detail__glance dl.event-detail__facts:last-of-type .event-detail__fact',
        ),
        (row) => ({
          name: row.querySelector('dt')?.textContent?.trim(),
          state: row.querySelector('dd span')?.textContent?.trim(),
          text: row.querySelector('a')?.textContent?.trim(),
          label: row.querySelector('a')?.getAttribute('aria-label'),
          href: row.querySelector('a')?.getAttribute('href'),
        }),
      );

    it('says both are off with a link to their tabs', async () => {
      const element = await render(success(), EVENT);

      expect(rows(element)).toEqual([
        {
          name: 'Save the date',
          state: 'Aus',
          text: 'Verwalten',
          label: 'Save the date verwalten',
          href: '/events/e1/save-the-date',
        },
        {
          name: 'Fotostation',
          state: 'Aus',
          text: 'Verwalten',
          label: 'Fotostation verwalten',
          href: '/events/e1/photo-stand',
        },
      ]);
    });

    it('says each is on once it is on, independent of the other', async () => {
      const on = { token: 't', url: 'https://vyte.example.com/x' };
      const both = await render(success(), {
        ...EVENT,
        saveTheDate: on,
        photoStand: on,
      } as unknown as VyteEvent);
      expect(rows(both).map((row) => row.state)).toEqual(['Eingeschaltet', 'Eingeschaltet']);

      TestBed.resetTestingModule();
      const onlyStand = await render(success(), {
        ...EVENT,
        photoStand: on,
      } as unknown as VyteEvent);
      expect(rows(onlyStand).map((row) => row.state)).toEqual(['Aus', 'Eingeschaltet']);
    });

    it('shows the block without address and deadline too', async () => {
      const element = await render(success(), { ...EVENT, address: null, rsvpDeadline: null });

      expect(rows(element)).toHaveLength(2);
    });
  });

  it('shows the failure when the event cannot be loaded', async () => {
    const element = await render(failed(new Failure('not-found', 'Nope')));

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('#event-detail-glance')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const element = await render(success(), EVENT);

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations without place, deadline, description and images', async () => {
    const element = await render(success(), {
      ...EVENT,
      past: true,
      locationName: null,
      address: null,
      rsvpDeadline: null,
      description: '',
      images: [],
    });

    await expect(element).toBeAccessible();
  });
});
