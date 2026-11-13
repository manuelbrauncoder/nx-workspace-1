import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { Guest, VyteEvent } from '../domain/print';
import { PrintUseCase } from '../domain/print.usecase';
import { PrintStore } from './print.store';

class FakePrintUseCase {
  event = { id: 'e1', title: 'Sommerfest', photoStand: null } as VyteEvent;
  guests = [
    { id: 'g1', name: 'Ada' },
    { id: 'g2', name: 'Ben' },
  ] as Guest[];
  eventFailure: Error | undefined;
  guestsFailure: Error | undefined;
  eventCalls: string[] = [];
  guestCalls: string[] = [];

  getEvent = (id: string): Observable<VyteEvent> => {
    this.eventCalls.push(id);
    return this.eventFailure ? throwError(() => this.eventFailure) : of(this.event);
  };
  getGuests = (id: string): Observable<Guest[]> => {
    this.guestCalls.push(id);
    return this.guestsFailure ? throwError(() => this.guestsFailure) : of([...this.guests]);
  };
}

describe('PrintStore', () => {
  let useCase: FakePrintUseCase;
  let store: PrintStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    useCase = new FakePrintUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: PrintUseCase, useValue: useCase }, PrintStore],
    });
    store = TestBed.inject(PrintStore);
  });

  it('loads nothing before an event is selected', async () => {
    await settle();

    expect(useCase.eventCalls).toEqual([]);
    expect(store.event()).toBeUndefined();
    expect(store.guests()).toEqual([]);
  });

  it('loads the event and the guests of the selected event', async () => {
    store.select('e1');
    await settle();

    expect(store.eventState().loadingState).toBe('success');
    expect(store.event()?.title).toBe('Sommerfest');
    expect(store.guestsState().loadingState).toBe('success');
    expect(store.guests().map((guest) => guest.name)).toEqual(['Ada', 'Ben']);
  });

  it('has an empty list for an event without guests', async () => {
    useCase.guests = [];
    store.select('e1');
    await settle();

    expect(store.guestsState().loadingState).toBe('success');
    expect(store.guests()).toEqual([]);
  });

  it('puts a failure to load the event in the event state', async () => {
    useCase.eventFailure = new Failure('not-found', 'No such event');
    store.select('e1');
    await settle();

    expect(store.eventState().loadingState).toBe('failure');
    expect(store.eventState().failure?.kind).toBe('not-found');
    expect(store.event()).toBeUndefined();
    expect(store.guestsState().loadingState).toBe('success');
  });

  it('puts a failure to load the guests in the guests state', async () => {
    useCase.guestsFailure = new Failure('server', 'Boom');
    store.select('e1');
    await settle();

    expect(store.guestsState().loadingState).toBe('failure');
    expect(store.guestsState().failure?.kind).toBe('server');
    expect(store.guests()).toEqual([]);
    expect(store.event()?.title).toBe('Sommerfest');
  });

  it('loads again on reload and recovers after a failure', async () => {
    useCase.eventFailure = new Failure('network', 'Offline');
    store.select('e1');
    await settle();
    useCase.eventFailure = undefined;

    store.reload();
    await settle();

    expect(store.eventState().loadingState).toBe('success');
    expect(useCase.eventCalls).toEqual(['e1', 'e1']);
    expect(useCase.guestCalls).toEqual(['e1', 'e1']);
  });

  it('loads the other event when another is selected', async () => {
    store.select('e1');
    await settle();
    store.select('e2');
    await settle();

    expect(useCase.eventCalls).toEqual(['e1', 'e2']);
  });
});
