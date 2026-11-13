import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { Photo, VyteEvent } from '../domain/photo';
import { PhotosUseCase } from '../domain/photos.usecase';
import { PhotosStore } from './photos.store';

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

class FakePhotosUseCase {
  event = { id: 'e1', title: 'Sommerfest' } as VyteEvent;
  photos = [photo('p1'), photo('p2', { hidden: true }), photo('p3', { source: 'guest' })];
  failWith: Error | undefined;

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getEvent = () => this._respond(() => this.event);
  getAll = () => this._respond(() => [...this.photos]);
  setHidden = (_eventId: string, id: string, hidden: boolean) =>
    this._respond(() => photo(id, { hidden }));
  delete = () => this._respond(() => undefined);
  photoUrl = (eventId: string, id: string) =>
    `https://api.example.com/events/${eventId}/photos/${id}`;
  archiveUrl = (eventId: string) => `https://api.example.com/events/${eventId}/photos.zip`;
}

describe('PhotosStore', () => {
  let useCase: FakePhotosUseCase;
  let store: PhotosStore;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  const ids = () => store.photos().map((existing) => existing.id);

  beforeEach(async () => {
    useCase = new FakePhotosUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: PhotosUseCase, useValue: useCase }, PhotosStore],
    });
    store = TestBed.inject(PhotosStore);
    store.select('e1');
    await settle();
  });

  it('loads the event and the photos of the selected event', () => {
    expect(store.eventState().loadingState).toBe('success');
    expect(store.event()?.title).toBe('Sommerfest');
    expect(store.photosState().loadingState).toBe('success');
    expect(ids()).toEqual(['p1', 'p2', 'p3']);
  });

  it('counts hidden and visible photos', () => {
    expect(store.hiddenCount()).toBe(1);
    expect(store.visibleCount()).toBe(2);
  });

  it('has no photos and no event before one is selected', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PhotosUseCase, useValue: useCase }, PhotosStore],
    });
    const fresh = TestBed.inject(PhotosStore);
    await settle();

    expect(fresh.event()).toBeUndefined();
    expect(fresh.photos()).toEqual([]);
    expect(fresh.visibleCount()).toBe(0);
    expect(fresh.photoUrl('p1')).toBeUndefined();
    expect(fresh.archiveUrl()).toBeUndefined();
  });

  it('reports a failed load with an empty list', async () => {
    useCase.failWith = new Failure('network', 'Offline');
    store.reload();
    await settle();

    expect(store.photosState().failure?.kind).toBe('network');
    expect(store.eventState().failure?.kind).toBe('network');
    expect(store.photos()).toEqual([]);
    expect(store.event()).toBeUndefined();
  });

  it('reports an event it does not know', async () => {
    useCase.failWith = new Failure('not-found', 'Nope');
    store.select('other');
    await settle();

    expect(store.eventState().failure?.kind).toBe('not-found');
  });

  it('builds the addresses of the photo and the archive for the selected event', () => {
    expect(store.photoUrl('p1')).toBe('https://api.example.com/events/e1/photos/p1');
    expect(store.archiveUrl()).toBe('https://api.example.com/events/e1/photos.zip');
  });

  it('replaces a photo with the answer of setHidden and keeps the order', async () => {
    const saved = await store.setHidden('p1', true);

    expect(saved?.hidden).toBe(true);
    expect(ids()).toEqual(['p1', 'p2', 'p3']);
    expect(store.hiddenCount()).toBe(2);
    expect(store.visibleCount()).toBe(1);

    await store.setHidden('p2', false);
    expect(store.hiddenCount()).toBe(1);
  });

  it('removes a deleted photo from the list', async () => {
    expect(await store.remove('p2')).toBe(true);

    expect(ids()).toEqual(['p1', 'p3']);
    expect(store.hiddenCount()).toBe(0);
  });

  it('keeps the list and reports the failure in mutationState', async () => {
    useCase.failWith = new Failure('forbidden', 'Not yours');

    expect(await store.setHidden('p1', true)).toBeUndefined();
    expect(await store.remove('p1')).toBe(false);

    expect(store.mutationState().failure?.kind).toBe('forbidden');
    expect(ids()).toEqual(['p1', 'p2', 'p3']);
    expect(store.hiddenCount()).toBe(1);
  });

  it('resets the mutation when another event is selected', async () => {
    useCase.failWith = new Failure('conflict', 'Over');
    await store.remove('p1');
    expect(store.mutationState().failure).toBeDefined();

    store.select('e2');

    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('writes nothing without a selected event', async () => {
    TestBed.resetTestingModule();
    const setHidden = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: PhotosUseCase, useValue: { ...useCase, setHidden, delete: setHidden } },
        PhotosStore,
      ],
    });
    const fresh = TestBed.inject(PhotosStore);

    expect(await fresh.setHidden('p1', true)).toBeUndefined();
    expect(await fresh.remove('p1')).toBe(false);
    expect(setHidden).not.toHaveBeenCalled();
  });
});
