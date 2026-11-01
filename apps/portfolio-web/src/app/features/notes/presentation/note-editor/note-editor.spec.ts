import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { NotesStore } from '../../application/notes.store';
import { Note } from '../../domain/note';
import { NoteEditor } from './note-editor';
import { noteEditorI18n } from './note-editor.i18n';

describe('NoteEditor', () => {
  const create = vi.fn();
  const update = vi.fn();
  const uploadImages = vi.fn();
  const removeImage = vi.fn();
  const confirm = vi.fn();
  const imageMutationState = signal<AsyncState>(idle());

  beforeEach(() => {
    vi.resetAllMocks();
    imageMutationState.set(idle());
    // jsdom has no object URLs.
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  async function render(detailState: AsyncState, note?: Note): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: NotesStore,
          useValue: {
            selected: signal(note),
            detailState: signal(detailState),
            mutationState: signal(idle()),
            imageMutationState,
            select: vi.fn(),
            create,
            update,
            uploadImages,
            removeImage,
          },
        },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    await loadI18nScopes(noteEditorI18n);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(NoteEditor);
    if (note) {
      fixture.componentRef.setInput('id', note.id);
    }
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function fillAndSubmit(element: HTMLElement, files: File[] = []): Promise<void> {
    const title = element.querySelector<HTMLInputElement>('app-form-text input')!;
    title.value = 'Einkauf';
    title.dispatchEvent(new Event('input'));
    if (files.length > 0) {
      const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      input.dispatchEvent(new Event('change'));
    }
    await settle();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('shows the form right away when there is nothing to load', async () => {
    const element = await render(idle());

    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelector('app-ui-spinner')).toBeNull();
  });

  it('shows the default spinner instead of the form while the note loads', async () => {
    const element = await render(loading());

    const spinner = element.querySelector('app-ui-spinner [role="status"]');
    expect(spinner?.getAttribute('aria-label')).toBe('Notiz wird geladen');
    expect(element.querySelector('[appUiSkeleton]')).toBeNull();
    expect(element.querySelector('form')).toBeNull();
  });

  it('shows the title error once the empty title field was left', async () => {
    const element = await render(idle());
    const title = element.querySelector<HTMLInputElement>('app-form-text input')!;
    expect(element.querySelector('[role="alert"]')).toBeNull();

    title.dispatchEvent(new Event('blur'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Bitte gib einen Titel ein.',
    );
  });

  it('shows the title error and saves nothing when the empty form is submitted', async () => {
    const element = await render(idle());
    const submitEvent = new Event('submit', { cancelable: true });

    element.querySelector('form')!.dispatchEvent(submitEvent);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Bitte gib einen Titel ein.',
    );
  });

  it('creates the note when a valid form is submitted', async () => {
    const element = await render(idle());

    await fillAndSubmit(element);

    expect(create).toHaveBeenCalledWith({ title: 'Einkauf', description: '' });
    expect(uploadImages).not.toHaveBeenCalled();
  });

  describe('images', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    const NOTE: Note = {
      id: '7',
      title: 'Einkauf',
      description: '',
      createdAt: new Date('2026-01-12T09:00:00.000Z'),
      updatedAt: new Date('2026-01-12T09:00:00.000Z'),
      images: [
        {
          id: 'i1',
          url: 'https://api.example.com/notes/7/images/i1',
          width: 800,
          height: 600,
          createdAt: new Date('2026-01-12T09:00:00.000Z'),
        },
      ],
    };

    it('uploads the chosen images once the note is created', async () => {
      create.mockResolvedValue({ ...NOTE, images: [] });
      uploadImages.mockResolvedValue([]);
      const element = await render(idle());

      await fillAndSubmit(element, [png]);

      expect(create).toHaveBeenCalledWith({ title: 'Einkauf', description: '' });
      expect(uploadImages).toHaveBeenCalledWith('7', [png]);
    });

    it('updates the created note instead of creating a second one after a failed upload', async () => {
      create.mockResolvedValue({ ...NOTE, images: [] });
      update.mockResolvedValue({ ...NOTE, images: [] });
      uploadImages.mockImplementation(async () => {
        imageMutationState.set(failed(new Failure('bad-request', 'Not an image')));
        return undefined;
      });
      const element = await render(idle());

      await fillAndSubmit(element, [png]);
      expect(element.querySelector('app-failure-alert')?.textContent).toContain(
        'Mindestens eine Datei ist kein gültiges Bild',
      );

      element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();

      expect(create).toHaveBeenCalledOnce();
      expect(update).toHaveBeenCalledWith('7', { title: 'Einkauf', description: '' });
      expect(uploadImages).toHaveBeenCalledTimes(2);
    });

    it('leaves room for as many new images as the note can still take', async () => {
      const element = await render(success(), NOTE);

      expect(element.querySelector('.form-files__count')?.textContent).toContain(
        '0 von 9 ausgewählt',
      );
    });

    it('deletes an existing image after confirmation', async () => {
      confirm.mockResolvedValue(true);
      removeImage.mockResolvedValue(true);
      const element = await render(success(), NOTE);

      element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
      await settle();

      expect(removeImage).toHaveBeenCalledWith('7', 'i1');
    });

    it('keeps the image when the deletion is not confirmed', async () => {
      confirm.mockResolvedValue(false);
      const element = await render(success(), NOTE);

      element.querySelector<HTMLButtonElement>('button[aria-label="Bild 1 löschen"]')!.click();
      await settle();

      expect(removeImage).not.toHaveBeenCalled();
    });
  });
});
