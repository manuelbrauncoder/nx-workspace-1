import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, loading, success } from '@core/state/async-state';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { EventsList } from './events-list';
import { eventsListI18n } from './events-list.i18n';

const event = (id: string, title: string, past = false): VyteEvent =>
  ({
    id,
    title,
    description: '',
    locationName: 'Alte Mühle',
    address: null,
    allDay: false,
    startsAt: new Date('2027-03-14T18:00:00.000Z'),
    endsAt: null,
    timeZone: 'Europe/Berlin',
    rsvpDeadline: null,
    role: 'owner',
    past,
    images: [],
    counts: { invited: 3, coming: 4, declined: 1, pending: 1, atMost: 6 },
  }) as unknown as VyteEvent;

describe('EventsList', () => {
  const reload = vi.fn();
  const loadList = vi.fn();

  async function render(state: AsyncState, events: VyteEvent[] = []) {
    const all = signal(events);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EventsStore,
          useValue: {
            listState: signal(state),
            isEmpty: computed(() => all().length === 0),
            upcoming: computed(() => all().filter((existing) => !existing.past)),
            past: computed(() => all().filter((existing) => existing.past)),
            reload,
            loadList,
          },
        },
      ],
    });
    await loadI18nScopes(eventsListI18n);
    const fixture = TestBed.createComponent(EventsList);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    reload.mockClear();
    loadList.mockClear();
  });

  it('asks the store to load the list', async () => {
    await render(loading());

    expect(loadList).toHaveBeenCalledTimes(1);
  });

  it('shows a skeleton while loading', async () => {
    const element = await render(loading());

    expect(element.querySelector('[appUiSkeleton]')).not.toBeNull();
    expect(element.querySelector('app-event-card')).toBeNull();
  });

  it('shows the failure and loads again on retry', async () => {
    const element = await render(failed(new Failure('network', 'Offline')));

    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Die Events konnten nicht geladen werden');
    alert?.querySelector('button')?.click();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('shows upcoming and past events in sections of their own', async () => {
    const element = await render(success(), [
      event('e1', 'Sommerfest'),
      event('e0', 'Silvester', true),
    ]);

    const sections = Array.from(element.querySelectorAll('section'));
    expect(sections.map((section) => section.querySelector('h2')?.textContent?.trim())).toEqual([
      'Kommend',
      'Vergangen',
    ]);
    const link = sections[0].querySelector('h3 a');
    expect(link?.textContent?.trim()).toBe('Sommerfest');
    expect(link?.getAttribute('href')).toBe('/events/e1');
    expect(sections[0].textContent).toContain('So., 14. März 2027, 19:00 Uhr');
    expect(sections[0].textContent).toContain('Kommen: 4 · Offen: 1');
  });

  it('leaves out a section without events', async () => {
    const element = await render(success(), [event('e1', 'Sommerfest')]);

    expect(element.querySelectorAll('section')).toHaveLength(1);
  });

  it('shows the empty state without events', async () => {
    const element = await render(success());

    expect(element.textContent).toContain('Noch keine Events');
    expect(element.querySelector('app-ui-empty a')?.getAttribute('href')).toBe('/new');
  });

  it('has no accessibility violations', async () => {
    const element = await render(success(), [
      event('e1', 'Sommerfest'),
      event('e0', 'Silvester', true),
    ]);

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations without events', async () => {
    const element = await render(success());

    await expect(element).toBeAccessible();
  });
});
