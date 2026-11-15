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
    expect(glance.querySelector('dl.event-detail__facts')).not.toBeNull();
    expect(glance.querySelector('[appUiSeparator]')).not.toBeNull();
    expect(element.textContent).toContain('Mo., 1. März 2027');
    const map = element.querySelector('.event-detail__map');
    expect(map?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/search?query=M%C3%BChlweg%201%0A12345%20Musterstadt',
    );
    expect(map?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows no facts and no line without address and deadline', async () => {
    const element = await render(success(), { ...EVENT, address: null, rsvpDeadline: null });

    expect(element.querySelector('dl.event-detail__facts')).toBeNull();
    expect(element.querySelector('.event-detail__glance [appUiSeparator]')).toBeNull();
  });

  it('shows only the deadline when there is no address', async () => {
    const element = await render(success(), { ...EVENT, address: null });

    expect(element.querySelector('dl.event-detail__facts')).not.toBeNull();
    expect(element.querySelector('.event-detail__map')).toBeNull();
    expect(element.querySelector('time')).not.toBeNull();
  });

  it('shows only the address when there is no deadline', async () => {
    const element = await render(success(), { ...EVENT, rsvpDeadline: null });

    expect(element.querySelector('.event-detail__map')).not.toBeNull();
    expect(element.querySelector('time')).toBeNull();
  });

  it('shows the counts at a glance with a link to the guest list', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('h2#event-detail-glance')?.textContent?.trim()).toBe(
      'Auf einen Blick',
    );
    const counts = Array.from(element.querySelectorAll('.event-detail__count dd'), (dd) =>
      dd.textContent?.trim(),
    );
    expect(counts).toEqual(['3', '4', '1', '1', '6']);
    const link = element.querySelector('a[href="/events/e1/guests"]');
    expect(link?.textContent?.trim()).toBe('Zur Gästeliste');
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

  it('shows the share section with the panels under their headings', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('h2#event-detail-share')?.textContent?.trim()).toBe('Teilen');
    const saveTheDate = element.querySelector('h3#event-detail-save-the-date');
    const photoStand = element.querySelector('h3#event-detail-photo-stand');
    expect(saveTheDate?.textContent?.trim()).toBe('Save the date');
    expect(saveTheDate?.getAttribute('tabindex')).toBe('-1');
    expect(photoStand?.textContent?.trim()).toBe('Fotostation');
    expect(photoStand?.getAttribute('tabindex')).toBe('-1');
    expect(element.querySelector('app-save-the-date-panel')).not.toBeNull();
    expect(element.querySelector('app-photo-stand-panel')).not.toBeNull();
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
