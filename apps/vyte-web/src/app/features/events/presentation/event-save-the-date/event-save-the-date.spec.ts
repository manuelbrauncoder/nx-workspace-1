import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { SeoService } from '@core/seo/seo.service';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { EventSaveTheDate } from './event-save-the-date';
import { eventSaveTheDateI18n } from './event-save-the-date.i18n';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  locationName: 'Alte Mühle',
  allDay: false,
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  role: 'owner',
  past: false,
  saveTheDate: null,
  photoStand: null,
} as VyteEvent;

describe('EventSaveTheDate', () => {
  const setPage = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  async function render(state: AsyncState, event?: VyteEvent) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { setPage } },
        {
          provide: EventsStore,
          useValue: {
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
    await loadI18nScopes(eventSaveTheDateI18n);
    const fixture = TestBed.createComponent(EventSaveTheDate);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the heading, focusable by the panel, and the lead', async () => {
    const element = await render(success(), EVENT);

    const heading = element.querySelector('h2#event-save-the-date-heading')!;
    expect(heading.textContent?.trim()).toBe('Save the date');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(element.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'event-save-the-date-heading',
    );
    expect(element.querySelector('.event-save-the-date__lead')?.textContent).toContain(
      'Ein öffentlicher Link, der den Termin ankündigt',
    );
  });

  it('renders the panel with the event', async () => {
    const element = await render(success(), EVENT);

    expect(element.querySelector('app-save-the-date-panel')).not.toBeNull();
  });

  it('puts the title of the event into the page title', async () => {
    await render(success(), EVENT);

    expect(setPage).toHaveBeenLastCalledWith({ title: 'Save the date · Sommerfest' });
  });

  it('sets no page title before the event is there', async () => {
    await render(loading());

    expect(setPage).toHaveBeenLastCalledWith(undefined);
  });

  it('shows no panel while loading', async () => {
    const element = await render(loading());

    expect(element.querySelector('app-save-the-date-panel')).toBeNull();
    expect(element.querySelector('h2')).toBeNull();
  });

  it('shows the failure when the event cannot be loaded', async () => {
    const element = await render(failed(new Failure('not-found', 'Nope')));

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('app-save-the-date-panel')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const element = await render(success(), EVENT);

    await expect(element).toBeAccessible();
  });
});
