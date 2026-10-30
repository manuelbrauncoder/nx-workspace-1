import { Signal, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { toFailure } from '../failure/to-failure';
import { AsyncState, failed, idle, loading, success } from './async-state';

/** Runs the writes of a store and tracks the most recent one as an `AsyncState`. */
export interface Mutation {
  readonly state: Signal<AsyncState>;
  /** Runs a write. Resolves with its result, or with `undefined` when it failed. */
  run<T>(operation: Observable<T>): Promise<T | undefined>;
  /** Back to `idle`, e.g. to drop the failure of an earlier write. */
  reset(): void;
}

/** Creates a `Mutation`. Writes that must not share their state each get their own. */
export function mutation(): Mutation {
  const state = signal<AsyncState>(idle());

  return {
    state: state.asReadonly(),
    async run<T>(operation: Observable<T>): Promise<T | undefined> {
      state.set(loading());
      try {
        const result = await firstValueFrom(operation);
        state.set(success());
        return result;
      } catch (error) {
        state.set(failed(toFailure(error)));
        return undefined;
      }
    },
    reset: () => state.set(idle()),
  };
}
