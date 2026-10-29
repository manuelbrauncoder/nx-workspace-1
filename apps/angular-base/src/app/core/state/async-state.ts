import { computed, Resource, Signal } from '@angular/core';
import { Failure } from '@core/failure/failure';
import { toFailure } from '@core/failure/to-failure';

export type LoadingState = 'idle' | 'loading' | 'success' | 'failure';

/** State of one asynchronous operation. Every store exposes its reads and writes in this shape. */
export interface AsyncState {
  loadingState: LoadingState;
  /** Set exactly when `loadingState` is `'failure'`. */
  failure: Failure | undefined;
}

// Create states only through these, so both fields always agree.
export const idle = (): AsyncState => ({ loadingState: 'idle', failure: undefined });
export const loading = (): AsyncState => ({ loadingState: 'loading', failure: undefined });
export const success = (): AsyncState => ({ loadingState: 'success', failure: undefined });
export const failed = (failure: Failure): AsyncState => ({ loadingState: 'failure', failure });

/** Derives the `AsyncState` of a resource. */
export function asyncState(resource: Resource<unknown>): Signal<AsyncState> {
  return computed(() => {
    switch (resource.status()) {
      case 'idle':
        return idle();
      case 'loading':
      case 'reloading':
        return loading();
      case 'error':
        return failed(toFailure(resource.error()));
      default:
        return success();
    }
  });
}
