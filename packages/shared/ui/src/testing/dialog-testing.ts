import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Provider } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Subject } from 'rxjs';

/**
 * Providers for the spec of a dialog component that is rendered on its own instead of through
 * `UiDialogService`: `injectUiDialogData()` returns `data`, `injectUiDialogRef().close()` calls
 * `close`. Keeps Spartan out of the specs of the apps.
 *
 * @example
 * const close = vi.fn();
 * TestBed.configureTestingModule({ providers: provideUiDialogTesting({ data, close }) });
 * const fixture = TestBed.createComponent(RenameNoteDialog);
 */
export function provideUiDialogTesting(options: {
  data?: unknown;
  close?: (result?: unknown) => void;
}): Provider[] {
  return [
    { provide: DIALOG_DATA, useValue: { data: options.data } },
    {
      provide: BrnDialogRef,
      useValue: {
        close: options.close ?? (() => undefined),
        closed$: new Subject(),
        dialogId: 'test',
        registerDescription: () => undefined,
        unregisterDescription: () => undefined,
      },
    },
  ];
}
