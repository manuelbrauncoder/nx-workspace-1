import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { Note, NoteDraft, NoteImage } from '../domain/note';
import { NotesUseCase } from '../domain/notes.usecase';
import { NotesStore } from './notes.store';

const note = (id: string, title: string): Note => ({
  id,
  title,
  description: '',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
  updatedAt: new Date('2026-01-12T09:00:00.000Z'),
  images: [],
});

const image = (id: string): NoteImage => ({
  id,
  url: `https://api.example.com/notes/2/images/${id}`,
  width: 800,
  height: 600,
  createdAt: new Date('2026-01-12T09:05:00.000Z'),
});

class FakeNotesUseCase {
  notes = [note('1', 'Erste'), note('2', 'Zweite')];
  failWith: Error | undefined;

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getAll(): Observable<Note[]> {
    return this._respond(() => [...this.notes]);
  }

  getById(id: string): Observable<Note> {
    const found = this.notes.find((existing) => existing.id === id);
    return found ? this._respond(() => found) : throwError(() => new Error('Nicht gefunden'));
  }

  create(draft: NoteDraft): Observable<Note> {
    return this._respond(() => ({ ...note('3', draft.title), description: draft.description }));
  }

  update(id: string, draft: NoteDraft): Observable<Note> {
    return this._respond(() => ({ ...note(id, draft.title), description: draft.description }));
  }

  delete(): Observable<void> {
    return this._respond(() => undefined);
  }

  uploadImages(_id: string, files: File[]): Observable<NoteImage[]> {
    return this._respond(() => files.map((file) => image(file.name)));
  }

  deleteImage(): Observable<void> {
    return this._respond(() => undefined);
  }
}

describe('NotesStore', () => {
  let useCase: FakeNotesUseCase;
  let store: NotesStore;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  const titles = () => store.notes().map((existing) => existing.title);

  beforeEach(() => {
    useCase = new FakeNotesUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: NotesUseCase, useValue: useCase }, NotesStore],
    });
  });

  async function loadedStore(): Promise<void> {
    store = TestBed.inject(NotesStore);
    await settle();
  }

  it('loads the notes', async () => {
    await loadedStore();

    expect(titles()).toEqual(['Erste', 'Zweite']);
    expect(store.isEmpty()).toBe(false);
    expect(store.listState()).toEqual({ loadingState: 'success', failure: undefined });
  });

  it('exposes a load failure and an empty list', async () => {
    const failure = new Failure('network', 'Server nicht erreichbar');
    useCase.failWith = failure;
    await loadedStore();

    expect(store.listState()).toEqual({ loadingState: 'failure', failure });
    expect(store.notes()).toEqual([]);
  });

  it('recovers through reload', async () => {
    useCase.failWith = new Error('Server nicht erreichbar');
    await loadedStore();

    useCase.failWith = undefined;
    store.reload();
    await settle();

    expect(titles()).toEqual(['Erste', 'Zweite']);
  });

  it('adds a created note to the top of the list', async () => {
    await loadedStore();

    const created = await store.create({ title: 'Dritte', description: 'Inhalt' });

    expect(created?.id).toBe('3');
    expect(titles()).toEqual(['Dritte', 'Erste', 'Zweite']);
    expect(store.mutationState().loadingState).toBe('success');
  });

  it('replaces an updated note and moves it to the top', async () => {
    await loadedStore();

    await store.update('2', { title: 'Zweite (neu)', description: '' });

    expect(titles()).toEqual(['Zweite (neu)', 'Erste']);
  });

  it('removes a deleted note', async () => {
    await loadedStore();

    expect(await store.remove('1')).toBe(true);
    expect(titles()).toEqual(['Zweite']);
  });

  it('keeps the list and reports the error when a write fails', async () => {
    await loadedStore();
    useCase.failWith = new Error('Speichern nicht möglich');

    expect(await store.create({ title: 'Dritte', description: '' })).toBeUndefined();
    expect(await store.remove('1')).toBe(false);

    expect(titles()).toEqual(['Erste', 'Zweite']);
    expect(store.mutationState().loadingState).toBe('failure');
    expect(store.mutationState().failure).toBeInstanceOf(Failure);
    expect(store.mutationState().failure).toMatchObject({ kind: 'unknown' });
  });

  it('loads the selected note and keeps it in sync after an update', async () => {
    await loadedStore();
    expect(store.detailState().loadingState).toBe('idle');

    store.select('2');
    await settle();
    expect(store.selected()?.title).toBe('Zweite');

    await store.update('2', { title: 'Zweite (neu)', description: '' });
    expect(store.selected()?.title).toBe('Zweite (neu)');

    store.select(undefined);
    await settle();
    expect(store.selected()).toBeUndefined();
    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('exposes an error for an unknown selected note', async () => {
    await loadedStore();

    store.select('unknown');
    await settle();

    expect(store.selected()).toBeUndefined();
    expect(store.detailState().loadingState).toBe('failure');
    expect(store.detailState().failure?.kind).toBe('unknown');
  });

  it('adds uploaded images to the selected note and the list, and removes them again', async () => {
    await loadedStore();
    store.select('2');
    await settle();

    const files = [new File(['a'], 'a'), new File(['b'], 'b')];
    expect(await store.uploadImages('2', files)).toHaveLength(2);
    expect(store.selected()?.images.map((existing) => existing.id)).toEqual(['a', 'b']);
    expect(store.notes()[1].images).toHaveLength(2);

    expect(await store.removeImage('2', 'a')).toBe(true);
    expect(store.selected()?.images.map((existing) => existing.id)).toEqual(['b']);
    expect(store.notes()[1].images).toHaveLength(1);
    expect(store.imageMutationState().loadingState).toBe('success');
  });

  it('reports a failed upload apart from the state of the note', async () => {
    await loadedStore();
    await store.update('2', { title: 'Zweite (neu)', description: '' });
    useCase.failWith = new Failure('bad-request', 'Not an image');

    expect(await store.uploadImages('2', [new File(['a'], 'a')])).toBeUndefined();
    expect(await store.removeImage('2', 'a')).toBe(false);

    expect(store.mutationState().loadingState).toBe('success');
    expect(store.imageMutationState().failure?.kind).toBe('bad-request');

    store.select(undefined);
    expect(store.imageMutationState().loadingState).toBe('idle');
  });
});
