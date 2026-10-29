import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, Subject, throwError } from 'rxjs';
import { asyncState } from './async-state';

describe('asyncState', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function stateOf(stream: (id: number) => Observable<string>) {
    const id = signal<number | undefined>(undefined);
    const state = runInInjectionContext(TestBed.inject(Injector), () =>
      asyncState(rxResource({ params: () => id(), stream: ({ params }) => stream(params) })),
    );
    return { id, state };
  }

  it('is idle while the resource has nothing to load', async () => {
    const { state } = stateOf(() => of('value'));
    await settle();

    expect(state()).toEqual({ loadingState: 'idle', failure: undefined });
  });

  it('goes from loading to success', async () => {
    const response = new Subject<string>();
    const { id, state } = stateOf(() => response);

    id.set(1);
    TestBed.tick();
    expect(state().loadingState).toBe('loading');

    response.next('value');
    response.complete();
    await settle();
    expect(state()).toEqual({ loadingState: 'success', failure: undefined });
  });

  it('exposes a failure as is', async () => {
    const failure = new Failure('not-found', 'Nicht gefunden');
    const { id, state } = stateOf(() => throwError(() => failure));

    id.set(1);
    await settle();

    expect(state()).toEqual({ loadingState: 'failure', failure });
  });

  it('normalizes any other error to a failure', async () => {
    const { id, state } = stateOf(() => throwError(() => new HttpErrorResponse({ status: 500 })));

    id.set(1);
    await settle();

    expect(state().failure).toBeInstanceOf(Failure);
    expect(state().failure).toMatchObject({ kind: 'server', status: 500 });
  });
});
