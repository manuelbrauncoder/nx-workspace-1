import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { Guest, GuestDraft, GuestsBulk, HostAnswer, VyteEvent } from '../domain/guest';
import { GuestsUseCase } from '../domain/guests.usecase';
import { GuestsStore } from './guests.store';

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

class FakeGuestsUseCase {
  event = { id: 'e1', title: 'Sommerfest', past: false } as VyteEvent;
  guests = [
    guest('g1', 'Ada', { maxCompanions: 2 }),
    guest('g2', 'Ben', { response: 'accepted', companions: 1, maxCompanions: 1 }),
    guest('g3', 'Cleo', { response: 'declined' }),
  ];
  failWith: Error | undefined;
  calls: unknown[][] = [];

  private _respond<T>(name: string, args: unknown[], value: () => T): Observable<T> {
    this.calls.push([name, ...args]);
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getEvent = (eventId: string) => this._respond('getEvent', [eventId], () => this.event);
  getAll = (eventId: string) => this._respond('getAll', [eventId], () => [...this.guests]);
  create = (eventId: string, draft: GuestDraft) =>
    this._respond('create', [eventId, draft], () => guest('g4', draft.name));
  createBulk = (eventId: string, bulk: GuestsBulk) =>
    this._respond('createBulk', [eventId, bulk], () =>
      bulk.names.map((name, index) => guest(`n${index}`, name)),
    );
  update = (eventId: string, id: string, draft: GuestDraft) =>
    this._respond('update', [eventId, id, draft], () => guest(id, draft.name));
  setResponse = (eventId: string, id: string, answer: HostAnswer) =>
    this._respond('setResponse', [eventId, id, answer], () =>
      guest(id, 'Ada', { response: answer.response, companions: answer.companions }),
    );
  renewToken = (eventId: string, id: string) =>
    this._respond('renewToken', [eventId, id], () => guest(id, 'Ada', { token: 'renewed' }));
  delete = (eventId: string, id: string) => this._respond('delete', [eventId, id], () => undefined);
  exportUrl = (eventId: string, language: string) => `export/${eventId}?lang=${language}`;
}

describe('GuestsStore', () => {
  let useCase: FakeGuestsUseCase;
  let store: GuestsStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    useCase = new FakeGuestsUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: GuestsUseCase, useValue: useCase }, GuestsStore],
    });
    store = TestBed.inject(GuestsStore);
    store.select('e1');
    await settle();
  });

  const names = () => store.guests().map((existing) => existing.name);

  it('loads nothing before an event is selected', async () => {
    TestBed.resetTestingModule();
    const fresh = new FakeGuestsUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: GuestsUseCase, useValue: fresh }, GuestsStore],
    });
    const idle = TestBed.inject(GuestsStore);
    await settle();

    expect(idle.event()).toBeUndefined();
    expect(idle.guests()).toEqual([]);
    expect(fresh.calls).toEqual([]);
    expect(idle.exportUrl('de')).toBeUndefined();
  });

  it('loads the event and its guests', () => {
    expect(store.event()?.title).toBe('Sommerfest');
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo']);
    expect(store.eventState().loadingState).toBe('success');
    expect(store.guestsState().loadingState).toBe('success');
  });

  it('counts from the list', () => {
    expect(store.counts()).toEqual({ invited: 3, coming: 2, declined: 1, pending: 1, atMost: 6 });
  });

  it('exposes a failed load as a state and no value', async () => {
    useCase.failWith = new Failure('not-found', 'Event not found');
    store.select('e2');
    await settle();

    expect(store.eventState().failure?.kind).toBe('not-found');
    expect(store.guestsState().failure?.kind).toBe('not-found');
    expect(store.event()).toBeUndefined();
    expect(store.guests()).toEqual([]);
  });

  it('reloads the event and the guests', async () => {
    useCase.guests = [guest('g9', 'Zoe')];

    store.reload();
    await settle();

    expect(names()).toEqual(['Zoe']);
  });

  it('adds a new guest and follows the counts', async () => {
    const created = await store.create({ name: 'Dan', note: '', maxCompanions: 0 });

    expect(created?.name).toBe('Dan');
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo', 'Dan']);
    expect(store.counts().invited).toBe(4);
    expect(store.mutationState().loadingState).toBe('success');
  });

  it('adds a pasted list', async () => {
    const added = await store.createBulk({ names: ['Dan', 'Eva'], maxCompanions: 1 });

    expect(added).toHaveLength(2);
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo', 'Dan', 'Eva']);
    expect(useCase.calls.at(-1)).toEqual([
      'createBulk',
      'e1',
      { names: ['Dan', 'Eva'], maxCompanions: 1 },
    ]);
  });

  it('replaces an edited guest in place', async () => {
    await store.update('g2', { name: 'Benedikt', note: '', maxCompanions: 1 });

    expect(names()).toEqual(['Ada', 'Benedikt', 'Cleo']);
  });

  it('replaces a guest whose answer a host entered, and counts it', async () => {
    await store.setResponse('g1', { response: 'accepted', companions: 2 });

    const ada = store.guests().find((existing) => existing.id === 'g1');
    expect(ada?.response).toBe('accepted');
    expect(store.counts()).toMatchObject({ coming: 5, pending: 0 });
  });

  it('replaces a guest with a new link', async () => {
    await store.renewToken('g1');

    expect(store.guests()[0]?.token).toBe('renewed');
  });

  it('removes a guest', async () => {
    expect(await store.remove('g2')).toBe(true);

    expect(names()).toEqual(['Ada', 'Cleo']);
    expect(store.counts().invited).toBe(2);
  });

  it('keeps the list and records the failure when a write fails', async () => {
    useCase.failWith = new Failure('conflict', 'Event is over');

    expect(await store.create({ name: 'Dan', note: '', maxCompanions: 0 })).toBeUndefined();
    expect(await store.createBulk({ names: ['Dan'], maxCompanions: 0 })).toBeUndefined();
    expect(await store.update('g1', { name: 'X', note: '', maxCompanions: 0 })).toBeUndefined();
    expect(await store.setResponse('g1', { response: 'declined', companions: 0 })).toBeUndefined();
    expect(await store.renewToken('g1')).toBeUndefined();
    expect(await store.remove('g1')).toBe(false);

    expect(store.mutationState().failure?.kind).toBe('conflict');
    expect(names()).toEqual(['Ada', 'Ben', 'Cleo']);
    expect(store.guestsState().loadingState).toBe('success');
  });

  it('drops the failure of a write on request and when another event is selected', async () => {
    useCase.failWith = new Failure('network', 'Offline');
    await store.remove('g1');
    expect(store.mutationState().loadingState).toBe('failure');

    store.resetMutation();
    expect(store.mutationState().loadingState).toBe('idle');

    await store.remove('g1');
    useCase.failWith = undefined;
    store.select('e2');
    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('gives the address of the export in a language', () => {
    expect(store.exportUrl('en')).toBe('export/e1?lang=en');
  });
});
