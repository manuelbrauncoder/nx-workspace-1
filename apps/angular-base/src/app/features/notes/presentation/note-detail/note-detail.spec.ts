import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { NotesStore } from '../../application/notes.store';
import { Note } from '../../domain/note';
import { NoteDeleteButton } from '../note-delete-button/note-delete-button';
import { NoteDetail } from './note-detail';
import { noteDetailI18n } from './note-detail.i18n';

const NOTE: Note = {
  id: '7',
  title: 'Einkauf',
  description: '<p>Milch</p><p><strong>Brot</strong></p>',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
  updatedAt: new Date('2026-01-13T14:30:00.000Z'),
  images: [],
};

describe('NoteDetail', () => {
  const select = vi.fn();
  const remove = vi.fn<(id: string) => Promise<boolean>>();

  let fixture: ComponentFixture<NoteDetail>;
  let element: HTMLElement;

  async function render(detailState: AsyncState, note?: Note): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: NotesStore,
          useValue: {
            selected: signal(note),
            detailState: signal(detailState),
            mutationState: signal(idle()),
            select,
            remove,
          },
        },
      ],
    });
    await loadI18nScopes(noteDetailI18n);
    fixture = TestBed.createComponent(NoteDetail);
    fixture.componentRef.setInput('id', '7');
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    select.mockClear();
    remove.mockReset();
  });

  it('selects the note of the bound id', async () => {
    await render(loading());

    expect(select).toHaveBeenCalledWith('7');
  });

  it('shows a spinner and no content while loading', async () => {
    await render(loading());

    expect(element.querySelector('app-ui-spinner')).not.toBeNull();
    expect(element.querySelector('article')).toBeNull();
  });

  it('renders the note with a link to its editor', async () => {
    await render(success(), NOTE);

    expect(element.querySelector('h1')?.textContent).toBe('Einkauf');
    expect(element.querySelector('.note-detail__content strong')?.textContent).toBe('Brot');
    expect(element.querySelector('a[aria-label="Bearbeiten: Einkauf"]')?.getAttribute('href')).toBe(
      '/notes/7/edit',
    );
  });

  it('marks a note without content', async () => {
    await render(success(), { ...NOTE, description: '' });

    expect(element.querySelector('.note-detail__content')?.textContent?.trim()).toBe('Kein Inhalt');
  });

  it('links every image to its file', async () => {
    const url = 'https://api.example.com/notes/7/images/i1';
    await render(success(), {
      ...NOTE,
      images: [{ id: 'i1', url, width: 800, height: 600, createdAt: NOTE.createdAt }],
    });

    const link = element.querySelector('app-ui-attachment a')!;
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('aria-label')).toBe('Bild 1 in voller Größe öffnen');
    expect(element.querySelector('app-ui-attachment img')?.getAttribute('alt')).toBe('Bild 1');
  });

  it('shows the failure when the note cannot be loaded', async () => {
    await render(failed(new Failure('not-found', 'Not found')));

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Der Eintrag wurde nicht gefunden.',
    );
    expect(element.querySelector('article')).toBeNull();
  });

  describe('deleting', () => {
    async function confirmDeletion(): Promise<ReturnType<typeof vi.spyOn>> {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const button: NoteDeleteButton = fixture.debugElement.query(
        By.directive(NoteDeleteButton),
      ).componentInstance;
      button.confirmed.emit();
      await fixture.whenStable();
      return navigate;
    }

    it('removes the note and returns to the list', async () => {
      remove.mockResolvedValue(true);
      await render(success(), NOTE);

      const navigate = await confirmDeletion();

      expect(remove).toHaveBeenCalledWith('7');
      expect(navigate).toHaveBeenCalledWith(['/notes']);
    });

    it('stays on the page when the deletion fails', async () => {
      remove.mockResolvedValue(false);
      await render(success(), NOTE);

      const navigate = await confirmDeletion();

      expect(remove).toHaveBeenCalledWith('7');
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
