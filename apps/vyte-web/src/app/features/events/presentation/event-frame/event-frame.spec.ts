import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { EventsUseCase } from '../../domain/events.usecase';
import { EventFrame } from './event-frame';

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
} as VyteEvent;

describe('EventFrame', () => {
  const select = vi.fn();
  const remove = vi.fn();
  const confirm = vi.fn();
  const toast = { success: vi.fn() };

  beforeEach(() => vi.resetAllMocks());

  async function render(state: AsyncState, event?: VyteEvent) {
    const store = {
      select,
      remove,
      selected: signal(event),
      detailState: signal(state),
      mutationState: signal<AsyncState>(idle()),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UiToastService, useValue: toast },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    TestBed.overrideComponent(EventFrame, {
      set: {
        providers: [
          { provide: EventsUseCase, useValue: {} },
          { provide: EventsStore, useValue: store },
        ],
      },
    });
    const fixture = TestBed.createComponent(EventFrame);
    fixture.componentRef.setInput('id', 'e1');
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      navigate,
      mutationState: store.mutationState as WritableSignal<AsyncState>,
    };
  }

  async function openMenu(event: VyteEvent) {
    const rendered = await render(success(), event);
    rendered.element
      .querySelector<HTMLButtonElement>('button[aria-label="Weitere Aktionen: Sommerfest"]')!
      .click();
    await rendered.fixture.whenStable();
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const item = (label: string) =>
      Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')).find((b) =>
        b.textContent?.includes(label),
      );
    return { ...rendered, menu, item };
  }

  it('selects the event of the route', async () => {
    await render(loading());

    expect(select).toHaveBeenCalledWith('e1');
  });

  it('shows the title as the only h1, with a fallback while loading', async () => {
    const loaded = await render(success(), EVENT);
    expect(loaded.element.querySelectorAll('h1')).toHaveLength(1);
    expect(loaded.element.querySelector('h1')?.textContent?.trim()).toBe('Sommerfest');

    TestBed.resetTestingModule();
    const pending = await render(loading());
    expect(pending.element.querySelector('h1')?.textContent?.trim()).toBe('Event');
    expect(pending.element.querySelector('.event-frame__actions')).toBeNull();
  });

  it('shows when and where', async () => {
    const { element } = await render(success(), EVENT);

    const facts = element.querySelector('.event-frame__facts')!;
    expect(facts.textContent).toContain('So., 14. März 2027, 19:00 Uhr');
    expect(facts.querySelector('.event-frame__place')?.textContent?.trim()).toBe('Alte Mühle');
    expect(facts.querySelector('.event-frame__past')).toBeNull();
  });

  it('leaves out the place when there is none and marks a past event', async () => {
    const { element } = await render(success(), { ...EVENT, locationName: null, past: true });

    expect(element.querySelector('.event-frame__place')).toBeNull();
    expect(element.querySelector('.event-frame__past')?.textContent?.trim()).toBe('Vorbei');
  });

  it('links to editing an upcoming event with its title in the name', async () => {
    const { element } = await render(success(), EVENT);

    const link = element.querySelector('a[href="/events/e1/edit"]');
    expect(link?.textContent?.trim()).toBe('Bearbeiten');
    expect(link?.getAttribute('aria-label')).toBe('Bearbeiten: Sommerfest');
  });

  it('offers no editing for a past event', async () => {
    const { element } = await render(success(), { ...EVENT, past: true });

    expect(element.querySelector('a[href="/events/e1/edit"]')).toBeNull();
  });

  it('links the six tabs with the label of the navigation', async () => {
    const { element } = await render(success(), EVENT);

    const nav = element.querySelector('nav[aria-label="Bereiche des Events"]')!;
    const tabs = Array.from(nav.querySelectorAll('a'), (a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(tabs).toEqual([
      ['Übersicht', '/events/e1'],
      ['Gäste', '/events/e1/guests'],
      ['Save the date', '/events/e1/save-the-date'],
      ['Fotostation', '/events/e1/photo-stand'],
      ['Fotos', '/events/e1/photos'],
      ['Team', '/events/e1/team'],
    ]);
  });

  it('hides the tabs and actions when the event cannot be loaded, the h1 stays', async () => {
    const { element } = await render(failed(new Failure('not-found', 'Nope')));

    expect(element.querySelector('app-ui-tab-nav')).toBeNull();
    expect(element.querySelector('.event-frame__actions')).toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Event');
  });

  it('renders the page of the tab in a router outlet', async () => {
    const { element } = await render(success(), EVENT);

    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('prints through the menu for an editor and after the event', async () => {
    for (const event of [
      { ...EVENT, role: 'editor' as const },
      { ...EVENT, past: true },
    ]) {
      TestBed.resetTestingModule();
      const { fixture, item, navigate } = await openMenu(event);

      item('Drucken')!.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/events', 'e1', 'print']);
    }
  });

  it('offers deleting only to the owner', async () => {
    const owner = await openMenu(EVENT);
    expect(owner.item('Löschen')).toBeDefined();

    TestBed.resetTestingModule();
    const editor = await openMenu({ ...EVENT, role: 'editor' });
    expect(editor.item('Drucken')).toBeDefined();
    expect(editor.item('Löschen')).toBeUndefined();
  });

  it('deletes after confirming, shows a toast and goes back to the list', async () => {
    confirm.mockResolvedValue(true);
    remove.mockResolvedValue(true);
    const { fixture, item, navigate } = await openMenu(EVENT);

    item('Löschen')!.click();
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(remove).toHaveBeenCalledWith('e1');
    expect(toast.success).toHaveBeenCalledWith('Event gelöscht');
    expect(navigate).toHaveBeenCalledWith(['/events']);
  });

  it('does not delete when the dialog is cancelled', async () => {
    confirm.mockResolvedValue(false);
    const { fixture, item, navigate } = await openMenu(EVENT);

    item('Löschen')!.click();
    await fixture.whenStable();

    expect(remove).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stays and shows the failure alert when deleting fails', async () => {
    confirm.mockResolvedValue(true);
    remove.mockResolvedValue(false);
    const { fixture, element, item, navigate, mutationState } = await openMenu(EVENT);

    item('Löschen')!.click();
    mutationState.set(failed(new Failure('conflict', 'Over')));
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Das Event konnte nicht gelöscht werden',
    );
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Sommerfest');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(success(), EVENT);

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations while the event is not loaded', async () => {
    const { element } = await render(failed(new Failure('not-found', 'Nope')));

    await expect(element).toBeAccessible();
  });
});
