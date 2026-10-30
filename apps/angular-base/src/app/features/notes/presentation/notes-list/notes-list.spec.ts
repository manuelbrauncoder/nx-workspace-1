import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { NotesStore } from '../../application/notes.store';
import { Note } from '../../domain/note';
import { NotesList } from './notes-list';
import { notesListI18n } from './notes-list.i18n';

const NOTE: Note = {
  id: '1',
  title: 'Erste',
  description: 'Inhalt',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
  updatedAt: new Date('2026-01-12T09:00:00.000Z'),
  images: [],
};

describe('NotesList', () => {
  const notes = signal<Note[]>([]);
  const listState = signal<AsyncState>(idle());
  const reload = vi.fn();

  let fixture: ComponentFixture<NotesList>;
  let element: HTMLElement;

  async function render(state: AsyncState, loaded: Note[] = []): Promise<void> {
    listState.set(state);
    notes.set(loaded);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: NotesStore,
          useValue: {
            notes,
            listState,
            isEmpty: () => notes().length === 0,
            mutationState: signal(idle()),
            reload,
          },
        },
      ],
    });
    await loadI18nScopes(notesListI18n);
    fixture = TestBed.createComponent(NotesList);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  beforeEach(() => reload.mockClear());

  it('shows a skeleton and does not create the content while loading', async () => {
    await render(loading(), [NOTE]);

    expect(element.querySelector('[role="status"]')?.textContent).toBe('Notizen werden geladen');
    expect(element.querySelector('[appUiSkeleton]')).not.toBeNull();
    expect(element.querySelector('app-ui-spinner')).toBeNull();
    expect(element.querySelector('app-async-content')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('app-note-card')).toBeNull();
  });

  it('shows the failure and reloads on retry', async () => {
    await render(failed(new Failure('network', 'Der Server ist nicht erreichbar.')));

    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Die Notizen konnten nicht geladen werden');
    expect(alert?.textContent).toContain('Der Server ist nicht erreichbar.');
    expect(element.querySelector('app-note-card')).toBeNull();

    alert?.querySelector('button')?.click();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('renders a card per note once loaded', async () => {
    await render(success(), [NOTE]);

    expect(element.querySelectorAll('app-note-card').length).toBe(1);
    expect(element.querySelector('[appUiSkeleton]')).toBeNull();
    expect(element.querySelector('app-async-content')?.getAttribute('aria-busy')).toBe('false');
  });

  it('renders the empty state when there are no notes', async () => {
    await render(success());

    expect(element.textContent).toContain('Noch keine Notizen');
  });

  it('switches from the skeleton to the content when loading finishes', async () => {
    await render(loading());

    notes.set([NOTE]);
    listState.set(success());
    await fixture.whenStable();

    expect(element.querySelector('[appUiSkeleton]')).toBeNull();
    expect(element.querySelectorAll('app-note-card').length).toBe(1);
  });
});
