import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { PhotosStore } from '../../application/photos.store';
import { Photo, VyteEvent } from '../../domain/photo';
import { PhotoDialog } from '../photo-dialog/photo-dialog';
import { PhotoList } from './photo-list';
import { photoListI18n } from './photo-list.i18n';

const EVENT = { id: 'e1', title: 'Sommerfest' } as VyteEvent;

const photo = (id: string, overrides: Partial<Photo> = {}): Photo => ({
  id,
  source: 'stand',
  uploaderName: null,
  width: 1600,
  height: 900,
  hidden: false,
  createdAt: new Date('2027-03-14T18:00:00.000Z'),
  ...overrides,
});

const PHOTOS = [
  photo('p1', { uploaderName: 'Ada', source: 'guest' }),
  photo('p2'),
  photo('p3', { uploaderName: 'Ben', hidden: true }),
];

describe('PhotoList', () => {
  const store = {
    select: vi.fn(),
    reload: vi.fn(),
    photoUrl: vi.fn(),
    archiveUrl: vi.fn(),
    setHidden: vi.fn(),
    remove: vi.fn(),
  };
  const open = vi.fn();
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    store.photoUrl.mockImplementation(
      (id: string) => `https://api.example.com/events/e1/photos/${id}`,
    );
    store.archiveUrl.mockReturnValue('https://api.example.com/events/e1/photos.zip');
  });

  async function render(
    options: {
      event?: VyteEvent;
      eventState?: AsyncState;
      photos?: Photo[];
      photosState?: AsyncState;
      mutationState?: AsyncState;
    } = {},
  ) {
    const photos = options.photos ?? PHOTOS;
    const hidden = photos.filter((item) => item.hidden).length;
    const event = 'event' in options ? options.event : EVENT;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://api.example.com' },
        {
          provide: PhotosStore,
          useValue: {
            ...store,
            event: signal(event),
            eventState: signal(options.eventState ?? success()),
            photos: signal(photos),
            photosState: signal(options.photosState ?? success()),
            hiddenCount: signal(hidden),
            visibleCount: signal(photos.length - hidden),
            mutationState: signal(options.mutationState ?? idle()),
          },
        },
        { provide: UiDialogService, useValue: { open } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(photoListI18n);
    const fixture = TestBed.createComponent(PhotoList);
    fixture.componentRef.setInput('id', 'e1');
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const cardOf = (element: HTMLElement, name: string) =>
    Array.from(element.querySelectorAll<HTMLElement>('app-photo-card')).find((card) =>
      card.textContent?.includes(name),
    )!;
  /** Opens the action menu of a card and picks an item, the items live in an overlay. */
  async function pick(
    fixture: { whenStable(): Promise<unknown> },
    card: HTMLElement,
    trigger: string,
    item: string,
  ) {
    card.querySelector<HTMLButtonElement>(`button[aria-label="${trigger}"]`)!.click();
    await fixture.whenStable();
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
      .find((candidate) => candidate.textContent?.trim() === item)!
      .click();
    await fixture.whenStable();
  }
  const click = (card: HTMLElement, label: string) =>
    card.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
  const summary = (element: HTMLElement) =>
    element.querySelector('.photo-list__summary p')?.textContent?.trim();

  it('selects the event of the route', async () => {
    await render();

    expect(store.select).toHaveBeenCalledWith('e1');
  });

  it('has no heading, breadcrumb or event lead of its own, the frame of the event brings them', async () => {
    const { element } = await render();

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav[aria-label="Navigationspfad"]')).toBeNull();
    expect(element.querySelector('.photo-list__event')).toBeNull();
  });

  it('has no heading of its own while loading', async () => {
    const { element } = await render({
      event: undefined,
      eventState: loading(),
      photos: [],
      photosState: loading(),
    });

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('app-photo-card')).toBeNull();
  });

  it('shows a failure to load the event with a retry that reloads', async () => {
    const { element } = await render({
      event: undefined,
      eventState: failed(new Failure('server', 'Down')),
      photos: [],
      photosState: failed(new Failure('server', 'Down')),
    });

    expect(element.textContent).toContain('Das Event konnte nicht geladen werden');
    element
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) => button.textContent?.includes('Erneut versuchen') && button.click());
    expect(store.reload).toHaveBeenCalled();
  });

  it('shows the failure to load the photos below the heading of the list', async () => {
    const { element } = await render({
      photos: [],
      photosState: failed(new Failure('network', 'Offline')),
    });

    expect(element.textContent).toContain('Die Fotos konnten nicht geladen werden');
    expect(element.textContent).not.toContain('Noch keine Fotos');
  });

  it('lists every photo, hidden ones too, with the count', async () => {
    const { element } = await render({ photos: [PHOTOS[0], PHOTOS[1]] });

    expect(element.querySelectorAll('app-photo-card')).toHaveLength(2);
    expect(summary(element)).toBe('2 Fotos, neueste zuerst');
  });

  it('counts the hidden photos in the text when there are some', async () => {
    const { element } = await render();

    expect(element.querySelectorAll('app-photo-card')).toHaveLength(3);
    expect(summary(element)).toBe('3 Fotos, davon 1 verborgen, neueste zuerst');
    expect(cardOf(element, 'Ben').classList.contains('photo-card--hidden')).toBe(true);
  });

  describe('ZIP link', () => {
    it('downloads the visible photos', async () => {
      const { element } = await render();

      const link = element.querySelector('a[download]')!;
      expect(link.getAttribute('href')).toBe('https://api.example.com/events/e1/photos.zip');
      expect(link.textContent).toContain('Sichtbare als ZIP laden');
    });

    it('is left out when every photo is hidden', async () => {
      const { element } = await render({ photos: [photo('p1', { hidden: true })] });

      expect(element.querySelectorAll('app-photo-card')).toHaveLength(1);
      expect(element.querySelector('a[download]')).toBeNull();
    });
  });

  it('shows an empty state without a ZIP link when there are no photos', async () => {
    const { element } = await render({ photos: [] });

    const empty = element.querySelector('app-ui-empty')!;
    expect(empty.textContent).toContain('Noch keine Fotos');
    expect(empty.textContent).toContain('Gäste laden Fotos über den QR-Code');
    expect(element.querySelector('a[download]')).toBeNull();
    expect(element.querySelector('.photo-list__summary')).toBeNull();
  });

  it('shows the failure of a change', async () => {
    const { element } = await render({ mutationState: failed(new Failure('server', 'Down')) });

    expect(element.querySelector('.photo-list__failure')?.textContent).toContain(
      'Die Änderung am Foto hat nicht geklappt',
    );
  });

  describe('card actions', () => {
    it('hides a visible photo and toasts it', async () => {
      store.setHidden.mockResolvedValue(photo('p1', { hidden: true }));
      const { element, fixture } = await render();

      await pick(fixture, cardOf(element, 'Ada'), 'Aktionen für Foto 1 von Ada', 'Verbergen');

      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Foto verborgen'));
      expect(store.setHidden).toHaveBeenCalledWith('p1', true);
    });

    it('shows a hidden photo again and toasts it', async () => {
      store.setHidden.mockResolvedValue(photo('p3', { hidden: false }));
      const { element, fixture } = await render();

      await pick(fixture, cardOf(element, 'Ben'), 'Aktionen für Foto 3 von Ben', 'Wieder zeigen');

      await vi.waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Foto wird wieder gezeigt'),
      );
      expect(store.setHidden).toHaveBeenCalledWith('p3', false);
    });

    it('toasts nothing when hiding fails', async () => {
      store.setHidden.mockResolvedValue(undefined);
      const { element, fixture } = await render();

      await pick(fixture, cardOf(element, 'Ada'), 'Aktionen für Foto 1 von Ada', 'Verbergen');
      await fixture.whenStable();

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('opens the photo large in a dialog', async () => {
      const { element } = await render();

      click(cardOf(element, 'Ada'), 'Foto 1 von Ada groß ansehen');

      expect(open).toHaveBeenCalledWith(PhotoDialog, {
        data: {
          src: 'https://api.example.com/events/e1/photos/p1',
          width: 1600,
          height: 900,
          heading: 'Foto von Ada',
          description: expect.stringMatching(/^Tischkarte · \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/),
        },
      });
    });

    it('names a photo without uploader in the dialog', async () => {
      const { element } = await render();

      click(cardOf(element, 'Ohne Namen'), 'Foto 2 von Ohne Namen groß ansehen');

      expect(open.mock.calls[0]![1].data.heading).toBe('Foto von Ohne Namen');
    });

    it('deletes only after confirmation and then focuses the list heading', async () => {
      store.remove.mockResolvedValue(true);
      const { element, fixture } = await render();

      confirm.mockResolvedValue(false);
      await pick(fixture, cardOf(element, 'Ada'), 'Aktionen für Foto 1 von Ada', 'Löschen');
      await fixture.whenStable();
      expect(store.remove).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          heading: 'Foto von Ada löschen?',
          confirmLabel: 'Löschen',
          variant: 'destructive',
        }),
      );
      expect(toast.success).not.toHaveBeenCalled();

      confirm.mockResolvedValue(true);
      await pick(fixture, cardOf(element, 'Ada'), 'Aktionen für Foto 1 von Ada', 'Löschen');
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Foto gelöscht'));

      expect(store.remove).toHaveBeenCalledWith('p1');
      expect(document.activeElement).toBe(element.querySelector('#photo-list-photos'));
    });

    it('keeps the focus and says nothing when deleting fails', async () => {
      store.remove.mockResolvedValue(false);
      confirm.mockResolvedValue(true);
      const { element, fixture } = await render();

      await pick(fixture, cardOf(element, 'Ada'), 'Aktionen für Foto 1 von Ada', 'Löschen');
      await vi.waitFor(() => expect(store.remove).toHaveBeenCalled());
      await fixture.whenStable();

      expect(toast.success).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(element.querySelector('#photo-list-photos'));
    });
  });

  it('has no accessibility violations with photos', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations when empty', async () => {
    const { element } = await render({ photos: [] });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations after a failure', async () => {
    const { element } = await render({
      mutationState: failed(new Failure('server', 'Down')),
    });

    await expect(element).toBeAccessible();
  });
});
