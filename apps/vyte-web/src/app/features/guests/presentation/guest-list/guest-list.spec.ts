import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { I18nService } from '@core/i18n/i18n.service';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { GuestsStore } from '../../application/guests.store';
import { Guest, VyteEvent } from '../../domain/guest';
import { countGuests } from '../../domain/guest-list';
import { GuestList } from './guest-list';
import { guestListI18n } from './guest-list.i18n';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  timeZone: 'Europe/Berlin',
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  past: false,
} as VyteEvent;

const guest = (id: string, name: string, overrides: Partial<Guest> = {}): Guest => ({
  id,
  name,
  note: null,
  maxCompanions: 0,
  token: `token-${id}`,
  photoToken: `photo-${id}`,
  response: 'pending',
  companions: 0,
  companionsReduced: false,
  message: null,
  answeredBy: null,
  respondedAt: null,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  updatedAt: new Date('2026-11-01T09:00:00.000Z'),
  ...overrides,
});

const GUESTS = [
  guest('g1', 'Ada Lovelace', {
    response: 'accepted',
    companions: 1,
    maxCompanions: 2,
    respondedAt: new Date('2026-11-05T10:00:00.000Z'),
  }),
  guest('g2', 'Ben Müller', {
    response: 'declined',
    respondedAt: new Date('2026-11-02T10:00:00.000Z'),
  }),
  guest('g3', 'Cleo Ángel'),
];

describe('GuestList', () => {
  const store = {
    select: vi.fn(),
    reload: vi.fn(),
    resetMutation: vi.fn(),
    exportUrl: vi.fn(),
    create: vi.fn(),
    createBulk: vi.fn(),
    update: vi.fn(),
    setResponse: vi.fn(),
    renewToken: vi.fn(),
    renewPhotoToken: vi.fn(),
    remove: vi.fn(),
  };
  const open = vi.fn();
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.resetAllMocks();
    store.exportUrl.mockImplementation(
      (language: string) => `https://api.example.com/events/e1/guests/export?lang=${language}`,
    );
    open.mockReturnValue({ closed: new Promise(() => undefined), close: vi.fn() });
  });

  async function render(
    options: {
      event?: VyteEvent;
      eventState?: AsyncState;
      guests?: Guest[];
      guestsState?: AsyncState;
      mutationState?: AsyncState;
      /** Query of the address, e.g. `?page=2`. */
      query?: string;
    } = {},
  ) {
    const guests = options.guests ?? GUESTS;
    const event = 'event' in options ? options.event : EVENT;
    const guestsSignal = signal(guests);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'events/:id/guests', component: GuestList }],
          withComponentInputBinding(),
        ),
        {
          provide: GuestsStore,
          useValue: {
            ...store,
            event: signal(event),
            eventState: signal(options.eventState ?? success()),
            guests: guestsSignal,
            guestsState: signal(options.guestsState ?? success()),
            counts: signal(countGuests(guests)),
            mutationState: signal(options.mutationState ?? idle()),
          },
        },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
        { provide: UiDialogService, useValue: { open } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(guestListI18n);
    const harness = await RouterTestingHarness.create(`/events/e1/guests${options.query ?? ''}`);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    return { harness, fixture: harness.fixture, element, router, guestsSignal };
  }

  const cardNames = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('app-guest-row h3'), (heading) =>
      heading.textContent?.trim(),
    );
  const result = (element: HTMLElement) =>
    element.querySelector('.guest-list__result')?.textContent?.trim();
  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );

  async function search(element: HTMLElement, query: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  async function choose(element: HTMLElement, text: string): Promise<void> {
    buttonWith(element, text)!.click();
    await settle();
  }

  it('selects the event of the route', async () => {
    await render();

    expect(store.select).toHaveBeenCalledWith('e1');
  });

  it('has no heading, breadcrumb or event lead of its own, the frame of the event brings them', async () => {
    const { element } = await render();

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav[aria-label="Navigationspfad"]')).toBeNull();
    expect(element.querySelector('.guest-list__event')).toBeNull();
  });

  it('has no heading of its own while loading', async () => {
    const { element } = await render({
      event: undefined,
      eventState: loading(),
      guests: [],
      guestsState: loading(),
    });

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('app-guest-row')).toBeNull();
  });

  it('shows a failure to load the event with a retry that reloads', async () => {
    const { element } = await render({
      event: undefined,
      eventState: failed(new Failure('server', 'Down')),
      guests: [],
      guestsState: failed(new Failure('server', 'Down')),
    });

    expect(element.textContent).toContain('Die Gästeliste konnte nicht geladen werden');
    expect(element.querySelector('app-guest-row')).toBeNull();
    buttonWith(element, 'Erneut versuchen')!.click();
    expect(store.reload).toHaveBeenCalledTimes(1);
  });

  it('shows the failure to load the guests below the heading of the list', async () => {
    const { element } = await render({
      guests: [],
      guestsState: failed(new Failure('network', 'Offline')),
    });

    expect(element.textContent).toContain('Die Gäste konnten nicht geladen werden');
    expect(element.textContent).not.toContain('Noch keine Gäste');
  });

  it('shows the counts', async () => {
    const { element } = await render();

    const counts = Array.from(element.querySelectorAll('.guest-list__count'), (count) => [
      count.querySelector('dt')?.textContent?.trim(),
      count.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(counts).toEqual([
      ['Eingeladen', '3'],
      ['Kommen', '2'],
      ['Abgesagt', '1'],
      ['Offen', '1'],
      ['Höchstens', '5'],
    ]);
  });

  it('offers adding for an upcoming event and no past alert', async () => {
    const { element } = await render();

    expect(buttonWith(element, 'Gast hinzufügen')).toBeDefined();
    expect(buttonWith(element, 'Liste einfügen')).toBeDefined();
    expect(element.querySelector('.guest-list__past')).toBeNull();
  });

  it('hides adding for a past event and says why', async () => {
    const { element } = await render({ event: { ...EVENT, past: true } });

    expect(buttonWith(element, 'Gast hinzufügen')).toBeUndefined();
    expect(buttonWith(element, 'Liste einfügen')).toBeUndefined();
    expect(element.querySelector('.guest-list__past')?.textContent).toContain(
      'Das Event ist vorbei',
    );
    expect(element.querySelector('a[download]')).not.toBeNull();
    // The rows only show.
    expect(element.querySelector('app-guest-row button')).toBeNull();
  });

  it('links the CSV export in the language of the page', async () => {
    const { element, fixture } = await render();
    const link = () => element.querySelector('a[download]')!;

    expect(link().getAttribute('href')).toBe(
      'https://api.example.com/events/e1/guests/export?lang=de',
    );
    expect(link().textContent).toContain('Als CSV exportieren');

    await TestBed.inject(I18nService).setLanguage('en');
    await fixture.whenStable();

    expect(link().getAttribute('href')).toBe(
      'https://api.example.com/events/e1/guests/export?lang=en',
    );
  });

  it('lists every guest by name with the result line', async () => {
    const { element } = await render();

    expect(cardNames(element)).toEqual(['Ada Lovelace', 'Ben Müller', 'Cleo Ángel']);
    expect(result(element)).toBe('3 von 3 Gästen');
    expect(element.querySelector('.guest-list__result')?.getAttribute('aria-live')).toBe('polite');
  });

  it('offers the filter and the sort as toggles', async () => {
    const { element } = await render();

    const labels = Array.from(element.querySelectorAll('.ui-toggle-group__item'), (item) =>
      item.textContent?.trim(),
    );
    expect(labels).toEqual(['Alle', 'Zusagen', 'Absagen', 'Offen', 'Name', 'Neueste Antworten']);
  });

  it('narrows the list with the filter and tells the result', async () => {
    const { element } = await render();

    await choose(element, 'Absagen');

    expect(cardNames(element)).toEqual(['Ben Müller']);
    expect(result(element)).toBe('1 von 3 Gästen');

    await choose(element, 'Alle');
    expect(cardNames(element)).toHaveLength(3);
  });

  it('narrows the list with the search, ignoring case and accents', async () => {
    const { element } = await render();

    await search(element, 'MULLER');
    expect(cardNames(element)).toEqual(['Ben Müller']);
    expect(result(element)).toBe('1 von 3 Gästen');

    await search(element, 'angel');
    expect(cardNames(element)).toEqual(['Cleo Ángel']);
  });

  it('says so when no guest matches filter and search', async () => {
    const { element } = await render();

    await search(element, 'zzz');

    expect(cardNames(element)).toEqual([]);
    expect(element.querySelector('.guest-list__none')?.textContent).toContain(
      'Kein Gast passt zu Filter und Suche.',
    );
    expect(result(element)).toBe('0 von 3 Gästen');
    expect(element.querySelector('app-ui-empty')).toBeNull();
    expect(element.querySelector('app-ui-pagination nav')).toBeNull();
  });

  it('sorts by the newest answers with the guests without one last, and back by name', async () => {
    const { element } = await render({
      guests: [
        guest('g1', 'Aaron'),
        guest('g2', 'Zoe', { response: 'accepted', respondedAt: new Date('2026-11-05T10:00:00Z') }),
      ],
    });
    expect(cardNames(element)).toEqual(['Aaron', 'Zoe']);

    await choose(element, 'Neueste Antworten');

    expect(cardNames(element)).toEqual(['Zoe', 'Aaron']);

    await choose(element, 'Name');
    expect(cardNames(element)).toEqual(['Aaron', 'Zoe']);
  });

  it('shows an empty state with an add button for an upcoming event', async () => {
    const { element } = await render({ guests: [] });

    const empty = element.querySelector('app-ui-empty')!;
    expect(empty.textContent).toContain('Noch keine Gäste');
    expect(empty.textContent).toContain('Füge Gäste einzeln hinzu');
    expect(empty.querySelector('button')?.textContent).toContain('Gast hinzufügen');
    expect(result(element)).toBe('');
  });

  it('shows an empty state without an add button for a past event', async () => {
    const { element } = await render({ guests: [], event: { ...EVENT, past: true } });

    const empty = element.querySelector('app-ui-empty')!;
    expect(empty.textContent).toContain('Auf der Liste dieses Events stand niemand.');
    expect(empty.querySelector('button')).toBeNull();
  });

  it('shows the failure of a change, with its own text for a conflict', async () => {
    const server = await render({ mutationState: failed(new Failure('server', 'Down')) });
    expect(server.element.querySelector('.guest-list__failure')?.textContent).toContain(
      'Die Änderung hat nicht geklappt',
    );

    TestBed.resetTestingModule();
    const conflict = await render({ mutationState: failed(new Failure('conflict', 'Past')) });
    expect(conflict.element.querySelector('.guest-list__failure')?.textContent).toContain(
      'Das Event ist vorbei, die Liste ist voll oder der Upload ist beendet.',
    );
  });

  const cardOf = (element: HTMLElement, name: string) =>
    Array.from(element.querySelectorAll<HTMLElement>('app-guest-row')).find((card) =>
      card.textContent?.includes(name),
    )!;

  async function pick(element: HTMLElement, name: string, item: string): Promise<void> {
    cardOf(element, name)
      .querySelector<HTMLButtonElement>(`button[aria-label="Aktionen für ${name}"]`)!
      .click();
    await settle();
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find((candidate) => candidate.textContent?.includes(item))!
      .click();
    await settle();
  }

  describe('dialogs', () => {
    it('opens the add dialog with a save through the store and toasts the new guest', async () => {
      const added = guest('g4', 'Dan');
      store.create.mockResolvedValue(added);
      open.mockReturnValue({ closed: Promise.resolve(added) });
      const { element } = await render();

      buttonWith(element, 'Gast hinzufügen')!.click();
      await settle();

      expect(store.resetMutation).toHaveBeenCalled();
      const data = open.mock.calls[0]![1].data;
      expect(data.guest).toBeUndefined();
      expect(await data.save({ name: 'Dan', note: '', maxCompanions: 0 })).toBe(added);
      expect(store.create).toHaveBeenCalledWith({ name: 'Dan', note: '', maxCompanions: 0 });
      expect(toast.success).toHaveBeenCalledWith('Dan steht auf der Liste');
    });

    it('toasts nothing when the dialog is dismissed', async () => {
      open.mockReturnValue({ closed: Promise.resolve(undefined) });
      const { element } = await render();

      buttonWith(element, 'Gast hinzufügen')!.click();
      await settle();

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('opens the bulk dialog and toasts how many were added', async () => {
      store.createBulk.mockResolvedValue([]);
      open.mockReturnValue({ closed: Promise.resolve([guest('n1', 'A'), guest('n2', 'B')]) });
      const { element } = await render();

      buttonWith(element, 'Liste einfügen')!.click();
      await settle();

      const data = open.mock.calls[0]![1].data;
      await data.save({ names: ['A', 'B'], maxCompanions: 1 });
      expect(store.createBulk).toHaveBeenCalledWith({ names: ['A', 'B'], maxCompanions: 1 });
      expect(toast.success).toHaveBeenCalledWith('Gäste hinzugefügt: 2');
    });
  });

  describe('card actions', () => {
    it('copies the link of the guest and says so', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { element } = await render();

      cardOf(element, 'Ben Müller')
        .querySelector<HTMLButtonElement>('button[aria-label="Link kopieren für Ben Müller"]')!
        .click();
      await settle();

      expect(writeText).toHaveBeenCalledWith('https://vyte.example.com/rsvp/token-g2');
      expect(toast.success).toHaveBeenCalledWith('Link für Ben Müller kopiert');
    });

    it('reports a link that could not be copied', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('Denied'));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { element } = await render();

      cardOf(element, 'Ben Müller')
        .querySelector<HTMLButtonElement>('button[aria-label="Link kopieren für Ben Müller"]')!
        .click();
      await settle();

      expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht kopiert werden');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('offers sharing only where the device can share, with the title, date and link', async () => {
      const without = await render();
      without.element
        .querySelector<HTMLButtonElement>('button[aria-label="Aktionen für Ada Lovelace"]')!
        .click();
      await settle();
      const items = () =>
        Array.from(document.querySelectorAll('[role="menuitem"]'), (item) => item.textContent);
      expect(items().some((text) => text?.includes('Bearbeiten'))).toBe(true);
      expect(items().some((text) => text?.includes('Teilen'))).toBe(false);

      TestBed.resetTestingModule();
      vi.resetAllMocks();
      store.exportUrl.mockReturnValue('x');
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      try {
        const { element, fixture } = await render();
        await fixture.whenStable();

        await pick(element, 'Ada Lovelace', 'Teilen');

        expect(share).toHaveBeenCalledWith({
          title: 'Sommerfest',
          text: expect.stringContaining('Sommerfest'),
          url: 'https://vyte.example.com/rsvp/token-g1',
        });
      } finally {
        Reflect.deleteProperty(navigator, 'share');
      }
    });

    it('opens the edit dialog for the guest and toasts the saved name', async () => {
      store.update.mockResolvedValue(undefined);
      open.mockReturnValue({ closed: Promise.resolve(guest('g2', 'Benedikt')) });
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Bearbeiten');

      const data = open.mock.calls[0]![1].data;
      expect(data.guest.id).toBe('g2');
      await data.save({ name: 'Benedikt', note: '', maxCompanions: 0 });
      expect(store.update).toHaveBeenCalledWith('g2', {
        name: 'Benedikt',
        note: '',
        maxCompanions: 0,
      });
      expect(toast.success).toHaveBeenCalledWith('Benedikt gespeichert');
    });

    it('opens the answer dialog for the guest and toasts it', async () => {
      store.setResponse.mockResolvedValue(undefined);
      open.mockReturnValue({ closed: Promise.resolve(guest('g3', 'Cleo Ángel')) });
      const { element } = await render();

      await pick(element, 'Cleo Ángel', 'Antwort eintragen');

      const data = open.mock.calls[0]![1].data;
      expect(data.guest.id).toBe('g3');
      await data.save({ response: 'declined', companions: 0 });
      expect(store.setResponse).toHaveBeenCalledWith('g3', { response: 'declined', companions: 0 });
      expect(toast.success).toHaveBeenCalledWith('Antwort für Cleo Ángel eingetragen');
    });

    it('renews a link only after confirmation', async () => {
      confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      store.renewToken.mockResolvedValue(guest('g2', 'Ben Müller'));
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Link erneuern');
      expect(store.renewToken).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();

      await pick(element, 'Ben Müller', 'Link erneuern');
      expect(confirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ heading: 'Neuen Link für Ben Müller erstellen?' }),
      );
      expect(store.renewToken).toHaveBeenCalledWith('g2');
      expect(toast.success).toHaveBeenCalledWith('Neuer Link für Ben Müller erstellt');
    });

    it('renews a photo link only after confirmation', async () => {
      confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      store.renewPhotoToken.mockResolvedValue(guest('g2', 'Ben Müller'));
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Foto-Link erneuern');
      expect(store.renewPhotoToken).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();

      await pick(element, 'Ben Müller', 'Foto-Link erneuern');
      expect(confirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ heading: 'Neuen Foto-Link für Ben Müller?' }),
      );
      expect(store.renewPhotoToken).toHaveBeenCalledWith('g2');
      expect(store.renewToken).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Neuer Foto-Link für Ben Müller erstellt');
    });

    it('says nothing when renewing a photo link fails', async () => {
      confirm.mockResolvedValue(true);
      store.renewPhotoToken.mockResolvedValue(undefined);
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Foto-Link erneuern');

      expect(store.renewPhotoToken).toHaveBeenCalledWith('g2');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('removes a guest only after confirmation and focuses the list heading', async () => {
      confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      store.remove.mockResolvedValue(true);
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Entfernen');
      expect(store.remove).not.toHaveBeenCalled();

      await pick(element, 'Ben Müller', 'Entfernen');
      expect(confirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ heading: 'Ben Müller entfernen?', variant: 'destructive' }),
      );
      expect(store.remove).toHaveBeenCalledWith('g2');
      expect(toast.success).toHaveBeenCalledWith('Ben Müller entfernt');
      expect(document.activeElement?.id).toBe('guest-list-guests');
    });

    it('says nothing when removing fails', async () => {
      confirm.mockResolvedValue(true);
      store.remove.mockResolvedValue(false);
      const { element } = await render();

      await pick(element, 'Ben Müller', 'Entfernen');

      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('counts', () => {
    it('are a definition list and there is no overview heading any more', async () => {
      const { element } = await render();

      expect(element.querySelector('dl.guest-list__counts')).not.toBeNull();
      expect(Array.from(element.querySelectorAll('h2'), (h) => h.textContent?.trim())).toEqual([
        'Gästeliste',
      ]);
      expect(element.textContent).not.toContain('Überblick');
    });
  });

  describe('rows', () => {
    it('renders each guest as a row in a list', async () => {
      const { element } = await render();

      expect(element.querySelectorAll('ul > li app-guest-row')).toHaveLength(3);
      expect(element.querySelector('app-guest-row')?.getAttribute('data-guest')).toBe('g1');
    });
  });

  describe('paging', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        guest(`m${index + 1}`, `Gast ${String(index + 1).padStart(2, '0')}`),
      );
    const pageLinks = (element: HTMLElement) =>
      Array.from(element.querySelectorAll('app-ui-pagination a'), (link) =>
        link.getAttribute('href'),
      );

    it('shows 25 guests on the first page with the result line of a paged list', async () => {
      const { element } = await render({ guests: many(60) });

      const names = cardNames(element);
      expect(names).toHaveLength(25);
      expect(names[0]).toBe('Gast 01');
      expect(names[24]).toBe('Gast 25');
      expect(result(element)).toBe('60 von 60 Gästen, Seite 1 von 3');
      expect(
        element.querySelector('app-ui-pagination nav[aria-label="Seiten der Gästeliste"]'),
      ).not.toBeNull();
    });

    it('shows exactly 25 guests without pagination', async () => {
      const { element } = await render({ guests: many(25) });

      expect(cardNames(element)).toHaveLength(25);
      expect(result(element)).toBe('25 von 25 Gästen');
      expect(element.querySelector('app-ui-pagination nav')).toBeNull();
    });

    it('shows the page of the address', async () => {
      const { element } = await render({ guests: many(60), query: '?page=3' });

      expect(cardNames(element)).toHaveLength(10);
      expect(cardNames(element)[0]).toBe('Gast 51');
      expect(result(element)).toBe('60 von 60 Gästen, Seite 3 von 3');
    });

    it('links the pages with the fragment of the list heading', async () => {
      const { element } = await render({ guests: many(60) });

      const links = pageLinks(element);
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) {
        expect(href).toMatch(/#guest-list-guests$/);
      }
      expect(links).toContain('/events/e1/guests?page=2#guest-list-guests');
    });

    it('clamps a page beyond the end to the last page', async () => {
      const { element } = await render({ guests: many(60), query: '?page=99' });

      expect(cardNames(element)[0]).toBe('Gast 51');
      expect(result(element)).toBe('60 von 60 Gästen, Seite 3 von 3');
    });

    it.each(['?page=0', '?page=-2', '?page=abc'])('shows the first page for %s', async (query) => {
      const { element } = await render({ guests: many(60), query });

      expect(cardNames(element)[0]).toBe('Gast 01');
      expect(result(element)).toBe('60 von 60 Gästen, Seite 1 von 3');
    });

    it('pages the filtered list and counts against all guests', async () => {
      const guests = [
        ...many(30).map((entry) => ({ ...entry, response: 'declined' as const })),
        guest('x1', 'Zoe'),
      ];
      const { element } = await render({ guests, query: '?filter=declined&page=2' });

      expect(cardNames(element)).toHaveLength(5);
      expect(result(element)).toBe('30 von 31 Gästen, Seite 2 von 2');
    });

    it('falls back to all and by name for unknown values', async () => {
      const { element } = await render({ query: '?filter=coming&sort=date' });

      expect(cardNames(element)).toEqual(['Ada Lovelace', 'Ben Müller', 'Cleo Ángel']);
    });

    it('reads filter and sort from the address', async () => {
      const { element } = await render({ query: '?filter=accepted&sort=answered' });

      expect(cardNames(element)).toEqual(['Ada Lovelace']);
    });
  });

  describe('navigation of filter, sort and search', () => {
    const many = Array.from({ length: 40 }, (_, index) =>
      guest(`m${index + 1}`, `Gast ${String(index + 1).padStart(2, '0')}`),
    );

    it('puts the filter into the address, keeps the other parameters and drops the page', async () => {
      const { element, router } = await render({
        guests: many,
        query: '?page=2&sort=answered',
      });
      const navigate = vi.spyOn(router, 'navigate');

      await choose(element, 'Offen');

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { filter: 'pending', page: null },
          queryParamsHandling: 'merge',
          scroll: 'manual',
        }),
      );
      expect(router.url).toBe('/events/e1/guests?sort=answered&filter=pending');
    });

    it('removes the filter from the address when all is chosen', async () => {
      const { element, router } = await render({ query: '?filter=declined' });

      await choose(element, 'Alle');

      expect(router.url).toBe('/events/e1/guests');
    });

    it('puts the sort into the address and removes it for the name', async () => {
      const { element, router } = await render({ guests: many, query: '?page=2' });
      const navigate = vi.spyOn(router, 'navigate');

      await choose(element, 'Neueste Antworten');
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({
          queryParams: { sort: 'answered', page: null },
          queryParamsHandling: 'merge',
          scroll: 'manual',
        }),
      );
      expect(router.url).toBe('/events/e1/guests?sort=answered');

      await choose(element, 'Name');
      expect(router.url).toBe('/events/e1/guests');
    });

    it('drops the page with a replaced address on a new search', async () => {
      const { element, router } = await render({ guests: many, query: '?page=2&filter=pending' });
      const navigate = vi.spyOn(router, 'navigate');

      await search(element, 'Gast 1');

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { page: null },
          replaceUrl: true,
          queryParamsHandling: 'merge',
        }),
      );
      expect(router.url).toBe('/events/e1/guests?filter=pending');
      expect(cardNames(element)[0]).toBe('Gast 10');
    });

    it('does not navigate for a search on the first page', async () => {
      const { element, router } = await render({ guests: many });
      const navigate = vi.spyOn(router, 'navigate');

      await search(element, 'Gast 1');

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('after adding a guest', () => {
    const base = Array.from({ length: 30 }, (_, index) =>
      guest(`m${index + 1}`, `Gast ${String(index + 1).padStart(2, '0')}`),
    );
    const focused = () =>
      document.activeElement?.closest('[data-guest]')?.getAttribute('data-guest');

    it('turns to the page of the new guest and focuses their link button', async () => {
      const added = guest('new', 'Zed');
      open.mockReturnValue({ closed: Promise.resolve(added) });
      const { element, router } = await render({ guests: [...base, added] });
      expect(cardNames(element)).not.toContain('Zed');

      buttonWith(element, 'Gast hinzufügen')!.click();
      await vi.waitFor(() => expect(router.url).toBe('/events/e1/guests?page=2'));
      await settle();

      await vi.waitFor(() => expect(focused()).toBe('new'));
      expect(document.activeElement?.classList.contains('guest-row__copy')).toBe(true);
      expect(cardNames(element)).toContain('Zed');
    });

    it('stays on the page and focuses the link button when the guest is on it', async () => {
      const added = guest('new', 'Aaron');
      open.mockReturnValue({ closed: Promise.resolve(added) });
      const { element, router } = await render({ guests: [...base, added] });
      const navigate = vi.spyOn(router, 'navigate');

      buttonWith(element, 'Gast hinzufügen')!.click();

      await vi.waitFor(() => expect(focused()).toBe('new'));
      expect(navigate).not.toHaveBeenCalled();
    });

    it('turns back to the first page, dropping the parameter, when the guest is there', async () => {
      const added = guest('new', 'Aaron');
      open.mockReturnValue({ closed: Promise.resolve(added) });
      const { element, router } = await render({ guests: [...base, added], query: '?page=2' });

      buttonWith(element, 'Gast hinzufügen')!.click();

      await vi.waitFor(() => expect(router.url).toBe('/events/e1/guests'));
      await vi.waitFor(() => expect(focused()).toBe('new'));
    });

    it('follows an edited guest to the page their new name sorts them onto', async () => {
      const renamed = guest('new', 'Zed');
      open.mockReturnValue({ closed: Promise.resolve(renamed) });
      const { element, router } = await render({ guests: [...base, renamed] });

      await pick(element, 'Gast 01', 'Bearbeiten');

      await vi.waitFor(() => expect(router.url).toBe('/events/e1/guests?page=2'));
      await vi.waitFor(() => expect(focused()).toBe('new'));
    });

    it('moves the focus to the list heading when a filter hides the answered guest', async () => {
      const answered = guest('m01', 'Gast 01');
      open.mockReturnValue({ closed: Promise.resolve({ ...answered, id: 'gone' }) });
      const { element } = await render({ guests: base });

      await pick(element, 'Gast 01', 'Antwort eintragen');

      await vi.waitFor(() => expect(document.activeElement?.id).toBe('guest-list-guests'));
    });

    it('does not turn the page when a filter hides the new guest', async () => {
      const added = guest('new', 'Aaron');
      open.mockReturnValue({ closed: Promise.resolve(added) });
      const { element, router } = await render({
        guests: [...base, added],
        query: '?filter=accepted',
      });
      const navigate = vi.spyOn(router, 'navigate');

      buttonWith(element, 'Gast hinzufügen')!.click();
      await settle();

      expect(navigate).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Aaron steht auf der Liste');
    });
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations for a past event', async () => {
    const { element } = await render({ event: { ...EVENT, past: true } });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with several pages', async () => {
    const guests = Array.from({ length: 60 }, (_, index) =>
      guest(`m${index + 1}`, `Gast ${String(index + 1).padStart(2, '0')}`),
    );
    const { element } = await render({ guests, query: '?page=2' });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations when empty', async () => {
    const { element } = await render({ guests: [] });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with a failure', async () => {
    const { element } = await render({
      mutationState: failed(new Failure('conflict', 'Past')),
      guestsState: failed(new Failure('server', 'Down')),
    });

    await expect(element).toBeAccessible();
  });
});
