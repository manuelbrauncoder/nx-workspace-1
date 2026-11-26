import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { QueuedPhoto, UploadStore } from '../../application/upload.store';
import { OwnPhoto, PHOTO_UPLOADER_NAME_MAX_LENGTH, Upload } from '../../domain/upload';
import { UploadPage } from './upload-page';
import { uploadPageI18n } from './upload-page.i18n';

const own = (id: string): OwnPhoto => ({
  id,
  width: 1600,
  height: 900,
  createdAt: new Date('2027-03-14T18:00:00.000Z'),
});

const UPLOAD: Upload = {
  eventTitle: 'Sommerfest',
  guestName: 'Ada',
  photos: [],
  limit: 5,
  left: 5,
  open: true,
  opensAt: new Date('2020-01-01T08:00:00.000Z'),
  closesAt: new Date('2099-01-01T08:00:00.000Z'),
};

const queued = (
  id: number,
  state: QueuedPhoto['state'],
  failure?: Failure,
  name = `${id}.jpg`,
): QueuedPhoto => ({
  id,
  file: new File(['x'], name, { type: 'image/jpeg' }),
  preview: `blob:preview-${id}`,
  state,
  failure,
});

describe('UploadPage', () => {
  const store = {
    select: vi.fn(),
    reload: vi.fn(),
    photoUrl: vi.fn(),
    add: vi.fn(),
    retry: vi.fn(),
    discard: vi.fn(),
    deletePhoto: vi.fn(),
  };
  const confirm = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    store.photoUrl.mockImplementation((id: string) => `https://api.example.com/photos/tok/${id}`);
    store.add.mockReturnValue({ accepted: [], wrongType: [], overLimit: [] });
  });

  async function render(
    options: {
      kind?: 'guest' | 'stand';
      upload?: Partial<Upload> | null;
      state?: AsyncState;
      queue?: QueuedPhoto[];
      batch?: { total: number; done: number };
      free?: number;
      deleteState?: AsyncState;
    } = {},
  ) {
    const response: ResponseInit = {};
    const upload = options.upload === null ? undefined : { ...UPLOAD, ...options.upload };
    const uploadSignal = signal<Upload | undefined>(upload);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UploadStore,
          useValue: {
            ...store,
            upload: uploadSignal,
            uploadState: signal(options.state ?? (upload ? success() : loading())),
            queue: signal(options.queue ?? []),
            failedCount: signal((options.queue ?? []).filter((i) => i.state === 'failed').length),
            batch: signal(options.batch ?? { total: 0, done: 0 }),
            free: signal(options.free ?? upload?.left ?? 0),
            deleteState: signal(options.deleteState ?? idle()),
          },
        },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: RESPONSE_INIT, useValue: response },
        { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://api.example.com' },
      ],
    });
    await loadI18nScopes(uploadPageI18n);
    const fixture = TestBed.createComponent(UploadPage);
    fixture.componentRef.setInput('token', 'tok');
    fixture.componentRef.setInput('kind', options.kind ?? 'guest');
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, response, uploadSignal };
  }

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const buttonLabelled = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  async function choose(
    fixture: { whenStable(): Promise<unknown> },
    element: HTMLElement,
    files: File[],
  ) {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function typeName(
    fixture: { whenStable(): Promise<unknown> },
    element: HTMLElement,
    value: string,
  ) {
    const field = element.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  it('selects the link of the route', async () => {
    await render({ kind: 'stand' });

    expect(store.select).toHaveBeenCalledWith({ kind: 'stand', token: 'tok' });
  });

  describe('headings', () => {
    it('greets the guest by name and shows the event', async () => {
      const { element } = await render();

      expect(text(element, 'h1')).toBe('Hey Ada, teil deine Fotos');
      expect(text(element, '.upload-page__kicker')).toBe('Sommerfest');
      expect(element.querySelector('app-form-text')).toBeNull();
    });

    it('has the stand heading and the optional name field at the stand', async () => {
      const { element } = await render({ kind: 'stand', upload: { guestName: null } });

      expect(text(element, 'h1')).toBe('Teil deine Fotos vom Abend');
      expect(element.querySelector('app-form-text')?.textContent).toContain('Dein Name (optional)');
    });

    it('keeps the heading while loading', async () => {
      const { element } = await render({ upload: null });

      expect(text(element, 'h1')).toBe('Fotos');
    });

    it('shows a failure to load with a retry that reloads', async () => {
      const { element } = await render({
        upload: null,
        state: failed(new Failure('server', 'Down')),
      });

      expect(text(element, 'h1')).toBe('Fotos');
      expect(element.textContent).toContain('Die Seite konnte nicht geladen werden');
      Array.from(element.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Erneut versuchen'))!
        .click();
      expect(store.reload).toHaveBeenCalled();
      expect(element.textContent).not.toContain('Link ungültig');
    });
  });

  describe('link not found', () => {
    it('says "Link ungültig" without a failure alert and answers 404', async () => {
      const { element, response } = await render({
        upload: null,
        state: failed(new Failure('not-found', 'Nope')),
      });

      expect(text(element, 'h1')).toBe('Link ungültig');
      expect(element.textContent).toContain('Dieser Link funktioniert nicht mehr');
      expect(element.querySelector('app-failure-alert')).toBeNull();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(response.status).toBe(404);
      await expect(element).toBeAccessible();
    });

    it('marks the intro as alone only for an unknown link', async () => {
      const notFound = await render({
        upload: null,
        state: failed(new Failure('not-found', 'Nope')),
      });
      expect(notFound.element.querySelector('.upload-page__intro--alone')).not.toBeNull();
      TestBed.resetTestingModule();

      const serverFailure = await render({
        upload: null,
        state: failed(new Failure('server', 'Down')),
      });
      expect(serverFailure.element.querySelector('.upload-page__intro')).not.toBeNull();
      expect(serverFailure.element.querySelector('.upload-page__intro--alone')).toBeNull();
    });

    it('does not answer 404 for other failures', async () => {
      const { response } = await render({
        upload: null,
        state: failed(new Failure('server', 'Down')),
      });

      expect(response.status).not.toBe(404);
    });
  });

  describe('while the window is open', () => {
    it('tells how many photos are left', async () => {
      const { element } = await render({ upload: { left: 3 }, free: 3 });

      expect(text(element, '.upload-page__left')).toBe('Noch 3 von 5 Fotos');
      expect(element.querySelectorAll('.upload-page__dot')).toHaveLength(5);
      expect(element.querySelectorAll('.upload-page__dot--used')).toHaveLength(2);
    });

    it('offers the picker with the allowed types', async () => {
      const { element } = await render();

      const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.multiple).toBe(true);
      expect(input.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp,image/avif');
      expect(element.querySelector('.upload-page__choose')?.textContent).toContain(
        'Fotos auswählen',
      );
      expect(text(element, '.upload-page__hint')).toContain('Hochladen geht bis');
    });

    it('hides the picker and says so when the limit is reached', async () => {
      const { element } = await render({ upload: { left: 0 }, free: 0 });

      expect(element.querySelector('input[type="file"]')).toBeNull();
      expect(element.textContent).toContain('Du hast alle 5 Fotos hochgeladen.');
    });

    it('hides the picker without the sentence while the rest is still queued', async () => {
      const { element } = await render({
        upload: { left: 1 },
        free: 0,
        queue: [queued(1, 'uploading')],
      });

      expect(element.querySelector('input[type="file"]')).toBeNull();
      expect(element.textContent).not.toContain('Du hast alle');
    });

    it('has no accessibility violations for a guest and for the stand', async () => {
      const guest = await render();
      await expect(guest.element).toBeAccessible();
      TestBed.resetTestingModule();

      const stand = await render({ kind: 'stand', upload: { guestName: null } });
      await expect(stand.element).toBeAccessible();
    });
  });

  describe('choosing files', () => {
    it('hands the files and the empty name of a guest to the store and says how many', async () => {
      const files = [new File(['x'], 'a.jpg', { type: 'image/jpeg' })];
      store.add.mockReturnValue({ accepted: files, wrongType: [], overLimit: [] });
      const { fixture, element } = await render();

      await choose(fixture, element, files);

      expect(store.add).toHaveBeenCalledWith(files, '');
      const notice = element.querySelector('.upload-page__notice')!;
      expect(notice.getAttribute('aria-live')).toBe('polite');
      expect(notice.textContent).toContain('Ausgewählt: 1.');
    });

    it('says what was left out because of the limit and the type', async () => {
      const file = new File(['x'], 'a.jpg');
      store.add.mockReturnValue({ accepted: [file], wrongType: [file, file], overLimit: [file] });
      const { fixture, element } = await render();

      await choose(fixture, element, [file]);

      const notice = text(element, '.upload-page__notice');
      expect(notice).toContain('Ausgewählt: 1.');
      expect(notice).toContain('Übersprungen, weil kein Platz mehr ist: 1.');
      expect(notice).toContain('Kein Foto im passenden Format (JPEG, PNG, WebP, AVIF): 2.');
    });

    it('reports only the wrong type when nothing is accepted', async () => {
      const file = new File(['x'], 'a.gif');
      store.add.mockReturnValue({ accepted: [], wrongType: [file], overLimit: [] });
      const { fixture, element } = await render();

      await choose(fixture, element, [file]);

      const notice = text(element, '.upload-page__notice');
      expect(notice).toContain('Kein Foto im passenden Format');
      expect(notice).not.toContain('Ausgewählt');
    });

    it('ignores an empty choice', async () => {
      const { fixture, element } = await render();

      await choose(fixture, element, []);

      expect(store.add).not.toHaveBeenCalled();
    });

    it('sends the name typed at the stand', async () => {
      const files = [new File(['x'], 'a.jpg')];
      const { fixture, element } = await render({ kind: 'stand', upload: { guestName: null } });
      await typeName(fixture, element, 'Ben');

      await choose(fixture, element, files);

      expect(store.add).toHaveBeenCalledWith(files, 'Ben');
    });

    it('sends an empty name at the stand when none is typed', async () => {
      const files = [new File(['x'], 'a.jpg')];
      const { fixture, element } = await render({ kind: 'stand', upload: { guestName: null } });

      await choose(fixture, element, files);

      expect(store.add).toHaveBeenCalledWith(files, '');
    });

    it('accepts a name of exactly the maximum length', async () => {
      const files = [new File(['x'], 'a.jpg')];
      const { fixture, element } = await render({ kind: 'stand', upload: { guestName: null } });
      await typeName(fixture, element, 'x'.repeat(PHOTO_UPLOADER_NAME_MAX_LENGTH));

      await choose(fixture, element, files);

      expect(store.add).toHaveBeenCalledWith(files, 'x'.repeat(PHOTO_UPLOADER_NAME_MAX_LENGTH));
    });

    it('blocks choosing and shows the message when the name is too long', async () => {
      const { fixture, element } = await render({ kind: 'stand', upload: { guestName: null } });
      await typeName(fixture, element, 'x'.repeat(PHOTO_UPLOADER_NAME_MAX_LENGTH + 1));

      await choose(fixture, element, [new File(['x'], 'a.jpg')]);

      expect(store.add).not.toHaveBeenCalled();
      expect(element.textContent).toContain(`Höchstens ${PHOTO_UPLOADER_NAME_MAX_LENGTH} Zeichen.`);
      await expect(element).toBeAccessible();
    });
  });

  describe('progress', () => {
    it('shows the progress of the batch with a progressbar', async () => {
      const { element } = await render({
        batch: { total: 4, done: 1 },
        queue: [queued(1, 'uploading')],
      });

      expect(text(element, '.upload-page__notice')).toContain('Hochgeladen: 1 von 4.');
      const bar = element.querySelector('[role="progressbar"]')!;
      expect(bar.getAttribute('aria-valuenow')).toBe('1');
      expect(bar.getAttribute('aria-valuemax')).toBe('4');
      expect(bar.getAttribute('aria-label')).toBe('Fortschritt der ausgewählten Fotos');
      expect(bar.getAttribute('aria-valuetext')).toBe('Hochgeladen: 1 von 4.');
    });

    it('tells how many did not work', async () => {
      const { element } = await render({
        batch: { total: 3, done: 2 },
        queue: [queued(1, 'failed', new Failure('network', 'Offline'))],
      });

      expect(text(element, '.upload-page__notice')).toContain(
        'Hochgeladen: 2 von 3, 1 hat nicht geklappt.',
      );
    });

    it('shows no progress without a batch', async () => {
      const { element } = await render();

      expect(element.querySelector('[role="progressbar"]')).toBeNull();
      expect(text(element, '.upload-page__notice')).toBe('');
    });
  });

  describe('the window', () => {
    it('says when it opens before the window', async () => {
      const { element } = await render({
        upload: {
          open: false,
          left: 5,
          opensAt: new Date('2099-01-01T08:00:00.000Z'),
          closesAt: new Date('2099-01-02T08:00:00.000Z'),
        },
      });

      expect(text(element, '.upload-page__window')).toMatch(
        /^Ab .+ kannst du hier Fotos hochladen\.$/,
      );
      expect(element.querySelector('input[type="file"]')).toBeNull();
      expect(element.textContent).not.toContain('Der Upload ist beendet');
      await expect(element).toBeAccessible();
    });

    it('has no own-photos section before the window without photos', async () => {
      const { element } = await render({
        upload: {
          open: false,
          photos: [],
          opensAt: new Date('2099-01-01T08:00:00.000Z'),
          closesAt: new Date('2099-01-02T08:00:00.000Z'),
        },
      });

      expect(element.querySelector('#upload-page-own')).toBeNull();
    });

    it('shows the own-photos section before the window when photos exist', async () => {
      const { element } = await render({
        upload: {
          open: false,
          photos: [own('p1')],
          opensAt: new Date('2099-01-01T08:00:00.000Z'),
          closesAt: new Date('2099-01-02T08:00:00.000Z'),
        },
      });

      expect(element.querySelector('#upload-page-own')).not.toBeNull();
      expect(element.querySelectorAll('.upload-page__tile')).toHaveLength(1);
    });

    it('shows the own-photos section while the window is open, also without photos', async () => {
      const { element } = await render({ upload: { open: true, photos: [] } });

      expect(element.querySelector('#upload-page-own')).not.toBeNull();
    });

    it('shows the own-photos section after the window', async () => {
      const { element } = await render({
        upload: {
          open: false,
          photos: [],
          opensAt: new Date('2020-01-01T08:00:00.000Z'),
          closesAt: new Date('2020-01-02T08:00:00.000Z'),
        },
      });

      expect(element.querySelector('#upload-page-own')).not.toBeNull();
    });

    it('says the upload is over after the window', async () => {
      const { element } = await render({
        upload: {
          open: false,
          opensAt: new Date('2020-01-01T08:00:00.000Z'),
          closesAt: new Date('2020-01-02T08:00:00.000Z'),
        },
      });

      expect(text(element, '.upload-page__window')).toBe('Der Upload ist beendet.');
      expect(element.querySelector('input[type="file"]')).toBeNull();
      await expect(element).toBeAccessible();
    });
  });

  describe('queue tiles', () => {
    it('shows waiting, uploading and failed photos with a local preview', async () => {
      const { element } = await render({
        queue: [
          queued(1, 'waiting'),
          queued(2, 'uploading'),
          queued(3, 'failed', new Failure('server', 'Boom')),
        ],
      });

      const tiles = Array.from(element.querySelectorAll('.upload-page__tile--queued'));
      expect(tiles.map((tile) => tile.getAttribute('data-state'))).toEqual([
        'waiting',
        'uploading',
        'failed',
      ]);
      expect(tiles[0].textContent).toContain('Wartet');
      expect(tiles[1].textContent).toContain('Lädt hoch');
      expect(tiles[2].textContent).toContain('Hat nicht geklappt.');
      expect(tiles[0].querySelector('img')?.getAttribute('src')).toBe('blob:preview-1');
      expect(element.querySelector('.upload-page__empty')).toBeNull();
      await expect(element).toBeAccessible();
    });

    it('explains a failure with 409 differently', async () => {
      const { element } = await render({
        queue: [queued(1, 'failed', new Failure('conflict', 'Closed'))],
      });

      expect(text(element, '.upload-page__tile--queued')).toContain(
        'Nicht mehr möglich: kein Platz oder Upload beendet.',
      );
    });

    it('offers retry and discard only for a failed photo', async () => {
      const { element } = await render({
        queue: [
          queued(1, 'waiting'),
          queued(2, 'failed', new Failure('network', 'Offline'), 'b.jpg'),
        ],
      });

      expect(element.querySelectorAll('.upload-page__queue-actions')).toHaveLength(1);
      expect(buttonLabelled(element, 'Erneut hochladen: b.jpg')).not.toBeNull();
      expect(buttonLabelled(element, 'Verwerfen: b.jpg')).not.toBeNull();
    });

    it('retries with the name of the stand and discards by id', async () => {
      const { fixture, element } = await render({
        kind: 'stand',
        upload: { guestName: null },
        queue: [queued(7, 'failed', new Failure('network', 'Offline'), 'b.jpg')],
      });
      await typeName(fixture, element, 'Ben');

      buttonLabelled(element, 'Erneut hochladen: b.jpg')!.click();
      expect(store.retry).toHaveBeenCalledWith(7, 'Ben');

      buttonLabelled(element, 'Verwerfen: b.jpg')!.click();
      expect(store.discard).toHaveBeenCalledWith(7);
      await fixture.whenStable();
      expect(text(element, '.upload-page__notice')).toContain('Verworfen: b.jpg.');
      expect(document.activeElement?.id).toBe('upload-page-own');
    });

    it('retries a guest photo with an empty name', async () => {
      const { element } = await render({
        queue: [queued(7, 'failed', new Failure('network', 'Offline'), 'b.jpg')],
      });

      buttonLabelled(element, 'Erneut hochladen: b.jpg')!.click();

      expect(store.retry).toHaveBeenCalledWith(7, '');
    });

    it('does not retry while the name of the stand is too long', async () => {
      const { fixture, element } = await render({
        kind: 'stand',
        upload: { guestName: null },
        queue: [queued(7, 'failed', new Failure('network', 'Offline'), 'b.jpg')],
      });
      await typeName(fixture, element, 'x'.repeat(PHOTO_UPLOADER_NAME_MAX_LENGTH + 1));

      buttonLabelled(element, 'Erneut hochladen: b.jpg')!.click();

      expect(store.retry).not.toHaveBeenCalled();
    });
  });

  describe('own photos', () => {
    it('says there are none yet, differently at the stand', async () => {
      const guest = await render();
      expect(text(guest.element, '.upload-page__empty')).toBe('Noch keine Fotos.');
      TestBed.resetTestingModule();

      const stand = await render({ kind: 'stand', upload: { guestName: null } });
      expect(text(stand.element, '.upload-page__empty')).toBe(
        'Von diesem Handy sind noch keine Fotos da.',
      );
    });

    it('lists the own photos with numbered alt text and delete buttons', async () => {
      const { element } = await render({ upload: { photos: [own('p1'), own('p2')], left: 3 } });

      const images = Array.from(element.querySelectorAll('.upload-page__tile img'));
      expect(images.map((image) => image.getAttribute('alt'))).toEqual(['Foto 1', 'Foto 2']);
      expect(images[0].getAttribute('src')).toContain('/photos/tok/p1');
      expect(buttonLabelled(element, 'Foto 2 löschen')).not.toBeNull();
      expect(element.querySelector('.upload-page__empty')).toBeNull();
      await expect(element).toBeAccessible();
    });

    it('deletes only after confirmation, then focuses the heading of the list', async () => {
      store.deletePhoto.mockResolvedValue(true);
      const { fixture, element } = await render({
        upload: { photos: [own('p1'), own('p2')], left: 3 },
      });

      confirm.mockResolvedValue(false);
      buttonLabelled(element, 'Foto 2 löschen')!.click();
      await fixture.whenStable();
      expect(store.deletePhoto).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          heading: 'Foto 2 löschen?',
          confirmLabel: 'Löschen',
          variant: 'destructive',
        }),
      );

      confirm.mockResolvedValue(true);
      buttonLabelled(element, 'Foto 2 löschen')!.click();
      await vi.waitFor(() => expect(store.deletePhoto).toHaveBeenCalledWith('p2'));
      await vi.waitFor(() =>
        expect(text(element, '.upload-page__notice')).toContain('Foto 2 gelöscht.'),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(element.querySelector('#upload-page-own'));
    });

    it('focuses main when deleting the last photo removes the section before the window', async () => {
      const main = document.createElement('main');
      main.id = 'main';
      main.tabIndex = -1;
      document.body.appendChild(main);
      try {
        const { fixture, element, uploadSignal } = await render({
          upload: {
            open: false,
            photos: [own('p1')],
            opensAt: new Date('2099-01-01T08:00:00.000Z'),
            closesAt: new Date('2099-01-02T08:00:00.000Z'),
          },
        });
        store.deletePhoto.mockImplementation(async () => {
          uploadSignal.update((current) => current && { ...current, photos: [] });
          return true;
        });
        confirm.mockResolvedValue(true);

        buttonLabelled(element, 'Foto 1 löschen')!.click();
        await vi.waitFor(() => expect(store.deletePhoto).toHaveBeenCalledWith('p1'));
        await vi.waitFor(() => expect(document.activeElement).toBe(main));
        await fixture.whenStable();

        expect(element.querySelector('#upload-page-own')).toBeNull();
        expect(document.activeElement).toBe(main);
      } finally {
        main.remove();
      }
    });

    it('says nothing and keeps the focus when deleting fails', async () => {
      store.deletePhoto.mockResolvedValue(false);
      confirm.mockResolvedValue(true);
      const { fixture, element } = await render({ upload: { photos: [own('p1')], left: 4 } });

      buttonLabelled(element, 'Foto 1 löschen')!.click();
      await vi.waitFor(() => expect(store.deletePhoto).toHaveBeenCalled());
      await fixture.whenStable();

      expect(text(element, '.upload-page__notice')).toBe('');
      expect(document.activeElement).not.toBe(element.querySelector('#upload-page-own'));
    });

    it('shows the failure of a deletion', async () => {
      const { element } = await render({
        upload: { photos: [own('p1')], left: 4 },
        deleteState: failed(new Failure('server', 'Boom')),
      });

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Das Foto konnte nicht gelöscht werden',
      );
      await expect(element).toBeAccessible();
    });
  });
});
