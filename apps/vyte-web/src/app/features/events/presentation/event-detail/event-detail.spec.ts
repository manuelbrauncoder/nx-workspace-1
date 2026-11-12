import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { EventDeleteButton } from '../event-delete-button/event-delete-button';
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
  const remove = vi.fn();
  const toast = { success: vi.fn() };

  beforeEach(() => vi.resetAllMocks());

  async function render(state: AsyncState, event?: VyteEvent) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EventsStore,
          useValue: {
            select,
            remove,
            selected: signal(event),
            detailState: signal(state),
            mutationState: signal(idle()),
          },
        },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(eventDetailI18n);
    const fixture = TestBed.createComponent(EventDetail);
    fixture.componentRef.setInput('id', 'e1');
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const mutationState = TestBed.inject(EventsStore)
      .mutationState as unknown as WritableSignal<AsyncState>;
    return { fixture, element: fixture.nativeElement as HTMLElement, navigate, mutationState };
  }

  it('selects the event of the route', async () => {
    await render(loading());

    expect(select).toHaveBeenCalledWith('e1');
  });

  it('shows when and where in the zone of the event, with a link to the map', async () => {
    const { element } = await render(success(), EVENT);

    expect(element.querySelector('h1')?.textContent).toBe('Sommerfest');
    expect(element.textContent).toContain('So., 14. März 2027, 19:00 Uhr');
    expect(element.textContent).toContain('Mo., 1. März 2027');
    const map = element.querySelector('a[target="_blank"]');
    expect(map?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/search?query=M%C3%BChlweg%201%0A12345%20Musterstadt',
    );
    expect(map?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('names the event in the breadcrumb', async () => {
    const { element } = await render(success(), EVENT);

    const breadcrumb = element.querySelector('nav[aria-label="Navigationspfad"]');
    expect(breadcrumb?.querySelector('a')?.getAttribute('href')).toBe('/events');
    expect(breadcrumb?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
      'Sommerfest',
    );
  });

  it('shows the counts of the guests', async () => {
    const { element } = await render(success(), EVENT);

    const counts = Array.from(element.querySelectorAll('.event-detail__count dd'), (dd) =>
      dd.textContent?.trim(),
    );
    expect(counts).toEqual(['3', '4', '1', '1', '6']);
  });

  it('offers editing and deleting to the owner of an upcoming event', async () => {
    const { element } = await render(success(), EVENT);

    expect(element.querySelector('a[href="/events/e1/edit"]')).not.toBeNull();
    expect(element.querySelector('app-event-delete-button')).not.toBeNull();
  });

  it('lets an editor edit but not delete', async () => {
    const { element } = await render(success(), { ...EVENT, role: 'editor' });

    expect(element.querySelector('a[href="/events/e1/edit"]')).not.toBeNull();
    expect(element.querySelector('app-event-delete-button')).toBeNull();
  });

  it('marks a past event and offers no editing', async () => {
    const { element } = await render(success(), { ...EVENT, past: true });

    expect(element.textContent).toContain('Vorbei');
    expect(element.querySelector('a[href="/events/e1/edit"]')).toBeNull();
  });

  it('goes back to the list after deleting', async () => {
    remove.mockResolvedValue(true);
    const { fixture, navigate } = await render(success(), EVENT);

    fixture.debugElement.query(By.directive(EventDeleteButton)).componentInstance.confirmed.emit();
    await fixture.whenStable();

    expect(remove).toHaveBeenCalledWith('e1');
    expect(toast.success).toHaveBeenCalledWith('Event gelöscht');
    expect(navigate).toHaveBeenCalledWith(['/events']);
  });

  it('stays on the page and shows the failure when deleting fails', async () => {
    remove.mockResolvedValue(false);
    const { fixture, element, navigate, mutationState } = await render(success(), EVENT);

    fixture.debugElement.query(By.directive(EventDeleteButton)).componentInstance.confirmed.emit();
    mutationState.set(failed(new Failure('conflict', 'Over')));
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Das Event konnte nicht gelöscht werden',
    );
    expect(element.querySelector('h1')?.textContent).toBe('Sommerfest');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(success(), EVENT);

    await expect(element).toBeAccessible();
  });

  it('keeps its heading when the event cannot be loaded', async () => {
    const { element } = await render(failed(new Failure('not-found', 'Nope')));

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Event');
    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations for a past event without a place', async () => {
    const { element } = await render(success(), {
      ...EVENT,
      past: true,
      locationName: null,
      address: null,
      images: [],
    });

    await expect(element).toBeAccessible();
  });
});
