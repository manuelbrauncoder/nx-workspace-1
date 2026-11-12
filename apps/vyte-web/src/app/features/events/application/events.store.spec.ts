import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { EventDraft, EventImage, VyteEvent } from '../domain/event';
import { EventsUseCase } from '../domain/events.usecase';
import { EventsStore, sortEvents } from './events.store';

const event = (id: string, title: string, startsAt: string, past = false): VyteEvent =>
  ({
    id,
    title,
    startsAt: new Date(startsAt),
    past,
    images: [] as EventImage[],
  }) as VyteEvent;

const image = (id: string, position: number): EventImage => ({
  id,
  url: `https://api.example.com/events/e1/images/${id}`,
  width: 1600,
  height: 900,
  position,
});

const DRAFT = { title: 'Neu', startsAt: new Date('2027-05-01T10:00:00.000Z') } as EventDraft;

class FakeEventsUseCase {
  events = [
    event('e1', 'Sommerfest', '2027-07-01T16:00:00.000Z'),
    event('e2', 'Hochzeit', '2027-09-01T12:00:00.000Z'),
    event('e0', 'Silvester', '2026-01-01T20:00:00.000Z', true),
  ];
  failWith: Error | undefined;

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getAll(): Observable<VyteEvent[]> {
    return this._respond(() => [...this.events]);
  }

  getById(id: string): Observable<VyteEvent> {
    const found = this.events.find((existing) => existing.id === id);
    return found ? this._respond(() => found) : throwError(() => new Failure('not-found', 'Nope'));
  }

  create(draft: EventDraft): Observable<VyteEvent> {
    return this._respond(() => event('e3', draft.title, draft.startsAt.toISOString()));
  }

  update(id: string, draft: EventDraft): Observable<VyteEvent> {
    return this._respond(() => event(id, draft.title, draft.startsAt.toISOString()));
  }

  delete(): Observable<void> {
    return this._respond(() => undefined);
  }

  uploadImages(): Observable<EventImage[]> {
    return this._respond(() => [image('i1', 0), image('i2', 1)]);
  }

  reorderImages(_id: string, images: EventImage[]): Observable<EventImage[]> {
    return this._respond(() => images.map((existing, position) => ({ ...existing, position })));
  }

  deleteImage(): Observable<EventImage[]> {
    return this._respond(() => [image('i2', 0)]);
  }
}

describe('sortEvents', () => {
  it('puts upcoming events soonest first and past ones latest first', () => {
    const sorted = sortEvents([
      event('a', 'Später', '2027-09-01T00:00:00.000Z'),
      event('b', 'Lange her', '2025-01-01T00:00:00.000Z', true),
      event('c', 'Bald', '2027-05-01T00:00:00.000Z'),
      event('d', 'Neulich', '2026-06-01T00:00:00.000Z', true),
    ]);

    expect(sorted.map((existing) => existing.id)).toEqual(['c', 'a', 'd', 'b']);
  });
});

describe('EventsStore', () => {
  let useCase: FakeEventsUseCase;
  let store: EventsStore;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();
  const ids = () => store.events().map((existing) => existing.id);

  beforeEach(async () => {
    useCase = new FakeEventsUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: EventsUseCase, useValue: useCase }, EventsStore],
    });
    store = TestBed.inject(EventsStore);
    await settle();
  });

  it('loads the events and splits them into upcoming and past', () => {
    expect(store.listState().loadingState).toBe('success');
    expect(store.upcoming().map((existing) => existing.id)).toEqual(['e1', 'e2']);
    expect(store.past().map((existing) => existing.id)).toEqual(['e0']);
    expect(store.isEmpty()).toBe(false);
  });

  it('reports a failed load with an empty list', async () => {
    useCase.failWith = new Failure('network', 'Offline');
    store.reload();
    await settle();

    expect(store.listState().failure?.kind).toBe('network');
    expect(store.events()).toEqual([]);
  });

  it('puts a created event in its place among the upcoming ones', async () => {
    const created = await store.create(DRAFT);

    expect(created?.id).toBe('e3');
    expect(ids()).toEqual(['e3', 'e1', 'e2', 'e0']);
  });

  it('moves an updated event to its new place and keeps the detail in sync', async () => {
    store.select('e1');
    await settle();

    await store.update('e1', {
      ...DRAFT,
      title: 'Spätsommer',
      startsAt: new Date('2027-10-01T10:00:00.000Z'),
    });

    expect(ids()).toEqual(['e2', 'e1', 'e0']);
    expect(store.selected()?.title).toBe('Spätsommer');
  });

  it('removes a deleted event and clears its selection', async () => {
    store.select('e1');
    await settle();

    expect(await store.remove('e1')).toBe(true);
    expect(ids()).toEqual(['e2', 'e0']);
  });

  it('keeps the list when a write fails', async () => {
    useCase.failWith = new Failure('conflict', 'Over');

    expect(await store.remove('e1')).toBe(false);
    expect(store.mutationState().failure?.kind).toBe('conflict');
    expect(ids()).toEqual(['e1', 'e2', 'e0']);
  });

  it('replaces the images with the answer of every image request', async () => {
    store.select('e1');
    await settle();

    await store.uploadImages('e1', [new File(['a'], 'a.png')]);
    expect(store.selected()?.images.map((existing) => existing.id)).toEqual(['i1', 'i2']);

    await store.reorderImages('e1', [image('i2', 1), image('i1', 0)]);
    expect(store.selected()?.images.map((existing) => existing.id)).toEqual(['i2', 'i1']);

    await store.removeImage('e1', 'i1');
    expect(store.selected()?.images.map((existing) => existing.id)).toEqual(['i2']);
    expect(store.events().find((existing) => existing.id === 'e1')?.images).toHaveLength(1);
  });

  it('gives a failed image request a state of its own', async () => {
    useCase.failWith = new Failure('bad-request', 'Not an image');

    expect(await store.uploadImages('e1', [new File(['a'], 'a.png')])).toBeUndefined();
    expect(store.imageMutationState().failure?.kind).toBe('bad-request');
    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('reports an event it does not know', async () => {
    store.select('nope');
    await settle();

    expect(store.detailState().failure?.kind).toBe('not-found');
    expect(store.selected()).toBeUndefined();
  });

  it('clears the selection and the write states with select(undefined)', async () => {
    store.select('e1');
    await settle();
    expect(store.selected()?.id).toBe('e1');
    useCase.failWith = new Failure('conflict', 'Over');
    await store.remove('e1');
    await store.uploadImages('e1', []);
    expect(store.mutationState().failure).toBeDefined();
    expect(store.imageMutationState().failure).toBeDefined();

    store.select(undefined);
    await settle();

    expect(store.selected()).toBeUndefined();
    expect(store.mutationState().loadingState).toBe('idle');
    expect(store.imageMutationState().loadingState).toBe('idle');
  });

  it('keeps the images when an image request fails', async () => {
    store.select('e1');
    await settle();
    useCase.failWith = new Failure('server', 'Boom');

    expect(await store.removeImage('e1', 'i1')).toBeUndefined();
    expect(await store.reorderImages('e1', [image('i1', 0)])).toBeUndefined();

    expect(store.imageMutationState().failure?.kind).toBe('server');
    expect(store.selected()?.images).toEqual([]);
  });
});
