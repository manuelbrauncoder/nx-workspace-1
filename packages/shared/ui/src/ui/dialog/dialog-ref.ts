import { inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { firstValueFrom } from 'rxjs';

/** Handle of an open dialog, for the opener as well as for the component inside. */
export interface UiDialogRef<TResult = void> {
  /** Closes the dialog and resolves `closed` with the result. */
  close(result?: TResult): void;
  /** Resolves once the dialog is gone. `undefined` when it was dismissed without a result. */
  readonly closed: Promise<TResult | undefined>;
}

/** @internal Hides the Spartan dialog reference behind `UiDialogRef`. */
export function toUiDialogRef<TResult>(ref: BrnDialogRef<TResult>): UiDialogRef<TResult> {
  return {
    close: (result) => ref.close(result),
    closed: firstValueFrom(ref.closed$, { defaultValue: undefined }),
  };
}

/**
 * Reference to the dialog the calling component is rendered in.
 *
 * @example
 * private readonly _dialogRef = injectUiDialogRef<string>();
 *
 * private _save(): void {
 *   this._dialogRef.close(this.name());
 * }
 */
export function injectUiDialogRef<TResult = void>(): UiDialogRef<TResult> {
  return toUiDialogRef(inject<BrnDialogRef<TResult>>(BrnDialogRef));
}

/**
 * The `data` passed to `UiDialogService.open()`, read inside the dialog component.
 *
 * @example
 * private readonly _note = injectUiDialogData<Note>();
 */
export function injectUiDialogData<TData>(): TData {
  return injectBrnDialogContext<{ data: TData }>().data;
}
