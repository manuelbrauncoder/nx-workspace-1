import { Signal } from '@angular/core';
import { AsyncState } from '@core/state/async-state';

/**
 * What the page hands a dialog of the guest list: how to save and the state of that save. The
 * dialog stays open while saving, shows a failure itself and closes with the result.
 */
export interface GuestDialogData<TValue, TResult> {
  save: (value: TValue) => Promise<TResult | undefined>;
  state: Signal<AsyncState>;
}
