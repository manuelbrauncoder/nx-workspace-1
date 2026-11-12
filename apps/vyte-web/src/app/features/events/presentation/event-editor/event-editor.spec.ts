import { ApplicationRef, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, success } from '@core/state/async-state';
import { FormDate } from '@shared/form-controls/form-date/form-date';
import { FormFiles } from '@shared/form-controls/form-files/form-files';
import { FormSwitch } from '@shared/form-controls/form-switch/form-switch';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { EventImage, VyteEvent } from '../../domain/event';
import { browserTimeZone } from '../../domain/event-times';
import { EventEditor } from './event-editor';
import { eventEditorI18n } from './event-editor.i18n';

const image = (id: string, position: number): EventImage => ({
  id,
  url: `https://api.example.com/events/e1/images/${id}`,
  width: 1600,
  height: 900,
  position,
});

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  description: '',
  locationName: null,
  address: null,
  allDay: false,
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
  role: 'owner',
  past: false,
  images: [image('i1', 0), image('i2', 1)],
  counts: { invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 },
} as unknown as VyteEvent;

describe('EventEditor', () => {
  const create = vi.fn();
  const update = vi.fn();
  const uploadImages = vi.fn();
  const reorderImages = vi.fn();
  const removeImage = vi.fn();
  const toast = { success: vi.fn() };
  const confirm = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(options: { id?: string; event?: VyteEvent; state?: AsyncState } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EventsStore,
          useValue: {
            select: vi.fn(),
            create,
            update,
            uploadImages,
            reorderImages,
            removeImage,
            selected: signal(options.event),
            detailState: signal(options.state ?? idle()),
            mutationState: signal(idle()),
            imageMutationState: signal(idle()),
          },
        },
        { provide: UiToastService, useValue: toast },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    await loadI18nScopes(eventEditorI18n);
    const fixture = TestBed.createComponent(EventEditor);
    fixture.componentRef.setInput('id', options.id);
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const element: HTMLElement = fixture.nativeElement;
    const dates = () =>
      fixture.debugElement
        .queryAll(By.directive(FormDate))
        .map((date) => date.componentInstance as FormDate);
    const store = TestBed.inject(EventsStore) as unknown as {
      mutationState: WritableSignal<AsyncState>;
      imageMutationState: WritableSignal<AsyncState>;
    };
    const files = () =>
      fixture.debugElement.query(By.directive(FormFiles)).componentInstance as FormFiles;
    return { fixture, element, navigate, dates, store, files };
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('creates an event in the zone of the browser and opens it', async () => {
    create.mockResolvedValue({ ...EVENT, id: 'e9' });
    const { element, navigate, dates } = await render();

    type(element.querySelector('app-form-text input')!, 'Sommerfest');
    dates()[0].value.set(new Date(2027, 2, 14));
    await settle();
    type(element.querySelector('input[type="time"]')!, '19:00');
    await submit(element);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sommerfest',
        allDay: false,
        startsAt: new Date(2027, 2, 14, 19, 0),
        endsAt: null,
        timeZone: browserTimeZone(),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Event gespeichert');
    expect(navigate).toHaveBeenCalledWith(['/events', 'e9']);
  });

  it('saves nothing without a title and a date and says what is missing', async () => {
    const { element } = await render();

    await submit(element);

    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib einen Titel ein.');
    expect(element.textContent).toContain('Bitte wähle das Datum des Events.');
  });

  it('hides the times of an all-day event', async () => {
    const { fixture, element } = await render();
    expect(element.querySelectorAll('input[type="time"]')).toHaveLength(2);

    (
      fixture.debugElement.query(By.directive(FormSwitch)).componentInstance as FormSwitch
    ).checked.set(true);
    await settle();

    expect(element.querySelectorAll('input[type="time"]')).toHaveLength(0);
  });

  it('refuses an end before the start', async () => {
    const { element, dates } = await render();

    type(element.querySelector('app-form-text input')!, 'Sommerfest');
    dates()[0].value.set(new Date(2027, 2, 14));
    dates()[1].value.set(new Date(2027, 2, 13));
    await settle();
    const [start, end] = Array.from(
      element.querySelectorAll<HTMLInputElement>('input[type="time"]'),
    );
    type(start, '19:00');
    type(end, '23:00');
    await submit(element);

    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Das Ende liegt vor dem Beginn.');
  });

  it('fills the form with the event and keeps its time zone when saving', async () => {
    update.mockResolvedValue(EVENT);
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    expect(element.querySelector<HTMLInputElement>('app-form-text input')?.value).toBe(
      'Sommerfest',
    );
    expect(element.querySelector<HTMLInputElement>('input[type="time"]')?.value).toBe('19:00');

    await submit(element);

    expect(update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ timeZone: 'Europe/Berlin' }),
    );
  });

  it('shows a past event without the form', async () => {
    const { element } = await render({
      id: 'e1',
      event: { ...EVENT, past: true },
      state: success(),
    });

    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain('Das Event ist vorbei');
  });

  it('moves an image and marks the first as the cover', async () => {
    reorderImages.mockResolvedValue([]);
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    expect(element.querySelector('.event-editor__image')?.textContent).toContain('Titelbild');
    expect(
      element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 nach vorn"]')?.disabled,
    ).toBe(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 nach hinten"]')!.click();
    await settle();

    expect(reorderImages).toHaveBeenCalledWith('e1', [image('i2', 1), image('i1', 0)]);
  });

  it('keeps the focus on the moved image', async () => {
    const { element, fixture } = await render({ id: 'e1', event: EVENT, state: success() });
    const selected = TestBed.inject(EventsStore).selected as ReturnType<
      typeof signal<VyteEvent | undefined>
    >;
    reorderImages.mockImplementation(async (_id: string, images: EventImage[]) => {
      selected.set({ ...EVENT, images });
      return images;
    });

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 nach hinten"]')!.click();
    await fixture.whenStable();

    // The image is last now, so its "later" button is disabled and "earlier" takes the focus.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Bild 2 nach vorn');
  });

  it('names the event in the breadcrumb while editing', async () => {
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    const links = Array.from(element.querySelectorAll('nav a'), (link) =>
      link.getAttribute('href'),
    );
    expect(links).toEqual(['/events', '/events/e1']);
  });

  const FILE = () => new File(['x'], 'a.png', { type: 'image/png' });
  const alertText = (element: HTMLElement) => element.querySelector('[role="alert"]')?.textContent;

  async function fillNewEvent(r: Awaited<ReturnType<typeof render>>) {
    type(r.element.querySelector('app-form-text input')!, 'Sommerfest');
    r.dates()[0].value.set(new Date(2027, 2, 14));
    await settle();
    type(r.element.querySelector('input[type="time"]')!, '19:00');
  }

  it('creates first and uploads the images of the new event in a second request', async () => {
    create.mockResolvedValue({ ...EVENT, id: 'e9' });
    uploadImages.mockResolvedValue([]);
    const r = await render();
    await fillNewEvent(r);
    const file = FILE();
    r.files().value.set([file]);
    await settle();

    await submit(r.element);

    expect(uploadImages).toHaveBeenCalledWith('e9', [file]);
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      uploadImages.mock.invocationCallOrder[0],
    );
    expect(r.navigate).toHaveBeenCalledWith(['/events', 'e9']);
  });

  it('updates instead of creating again when saving after a failed upload', async () => {
    create.mockResolvedValue({ ...EVENT, id: 'e9' });
    update.mockResolvedValue({ ...EVENT, id: 'e9' });
    uploadImages.mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);
    const r = await render();
    await fillNewEvent(r);
    r.files().value.set([FILE()]);
    await settle();

    await submit(r.element);
    expect(r.navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();

    await submit(r.element);

    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith('e9', expect.objectContaining({ title: 'Sommerfest' }));
    expect(uploadImages).toHaveBeenCalledTimes(2);
    expect(r.navigate).toHaveBeenCalledWith(['/events', 'e9']);
  });

  it('stays on the page and uploads nothing when the event is not saved', async () => {
    create.mockResolvedValue(undefined);
    const r = await render();
    await fillNewEvent(r);
    r.files().value.set([FILE()]);
    await settle();

    await submit(r.element);

    expect(uploadImages).not.toHaveBeenCalled();
    expect(r.navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('refuses a deadline after the start', async () => {
    const r = await render();
    await fillNewEvent(r);
    r.dates()[2].value.set(new Date(2027, 2, 14));
    await settle();

    await submit(r.element);

    expect(create).not.toHaveBeenCalled();
    expect(r.element.textContent).toContain('Die Antwortfrist muss vor dem Tag des Events enden.');
  });

  it('accepts a deadline on the day before the start', async () => {
    create.mockResolvedValue({ ...EVENT, id: 'e9' });
    const r = await render();
    await fillNewEvent(r);
    r.dates()[2].value.set(new Date(2027, 2, 13));
    await settle();

    await submit(r.element);

    expect(create).toHaveBeenCalledOnce();
  });

  it('removes an image after confirmation', async () => {
    confirm.mockResolvedValue(true);
    removeImage.mockResolvedValue([image('i2', 0)]);
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
    await settle();

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ heading: 'Bild 1 löschen?', variant: 'destructive' }),
    );
    expect(removeImage).toHaveBeenCalledWith('e1', 'i1');
    expect(toast.success).toHaveBeenCalledWith('Bild gelöscht');
  });

  it('keeps an image that was not confirmed for deletion', async () => {
    confirm.mockResolvedValue(false);
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
    await settle();

    expect(confirm).toHaveBeenCalled();
    expect(removeImage).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the failure when the event could not be saved', async () => {
    const { element, store } = await render();

    store.mutationState.set(failed(new Failure('conflict', 'Over')));
    await settle();

    expect(alertText(element)).toContain('Speichern fehlgeschlagen');
  });

  it('explains a rejected image upload and that the event is saved', async () => {
    const { element, store } = await render();

    store.imageMutationState.set(failed(new Failure('bad-request', 'Not an image')));
    await settle();

    expect(alertText(element)).toContain(
      'Das Event ist gespeichert, die Bilder wurden aber nicht hochgeladen',
    );
    expect(alertText(element)).toContain('Mindestens eine Datei ist kein gültiges Bild');
  });

  it('shows the generic text for another failed upload', async () => {
    const { element, store } = await render();

    store.imageMutationState.set(failed(new Failure('network', 'Offline')));
    await settle();

    expect(alertText(element)).toContain('Das Event ist gespeichert');
    expect(alertText(element)).not.toContain('kein gültiges Bild');
  });

  it('shows the failure of a move with its own heading', async () => {
    const r = await render({ id: 'e1', event: EVENT, state: success() });
    reorderImages.mockImplementation(async () => {
      r.store.imageMutationState.set(failed(new Failure('server', 'Boom')));
      return undefined;
    });

    r.element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 nach hinten"]')!.click();
    await settle();

    expect(alertText(r.element)).toContain(
      'Die Reihenfolge der Bilder konnte nicht gespeichert werden',
    );
  });

  it('shows the failure of a removal with its own heading', async () => {
    confirm.mockResolvedValue(true);
    const r = await render({ id: 'e1', event: EVENT, state: success() });
    removeImage.mockImplementation(async () => {
      r.store.imageMutationState.set(failed(new Failure('not-found', 'Gone')));
      return undefined;
    });

    r.element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
    await settle();

    expect(alertText(r.element)).toContain('Das Bild konnte nicht gelöscht werden');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('has no accessibility violations with validation errors showing', async () => {
    const { element } = await render();
    await submit(element);
    expect(element.textContent).toContain('Bitte gib einen Titel ein.');

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with a failure showing', async () => {
    const { element, store } = await render();
    store.imageMutationState.set(failed(new Failure('bad-request', 'Not an image')));
    await settle();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ id: 'e1', event: EVENT, state: success() });

    await expect(element).toBeAccessible();
  });

  it('moves the focus to the first invalid field after a failed submit', async () => {
    const { element } = await render();

    await submit(element);

    expect(document.activeElement).toBe(element.querySelector('app-form-text input'));
  });

  it('keeps the focus among the images after one was removed', async () => {
    confirm.mockResolvedValue(true);
    const { element, fixture } = await render({ id: 'e1', event: EVENT, state: success() });
    const selected = TestBed.inject(EventsStore).selected as ReturnType<
      typeof signal<VyteEvent | undefined>
    >;
    removeImage.mockImplementation(async () => {
      const images = [image('i2', 0)];
      selected.set({ ...EVENT, images });
      return images;
    });

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
    await fixture.whenStable();

    // The second image moved up, its remove button takes the focus.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Bild 1 löschen');
  });

  it('says where a moved image is now', async () => {
    reorderImages.mockResolvedValue([image('i2', 0), image('i1', 1)]);
    const { element, fixture } = await render({ id: 'e1', event: EVENT, state: success() });

    element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 nach hinten"]')!.click();
    await fixture.whenStable();

    expect(element.querySelector('p[role="status"]')?.textContent?.trim()).toBe(
      'Bild ist jetzt an Position 2',
    );
  });

  it('has no accessibility violations for a new event', async () => {
    const { element } = await render();
    await expect(element).toBeAccessible();
  });
});
