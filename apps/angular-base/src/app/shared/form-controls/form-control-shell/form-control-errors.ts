import { ValidationError } from '@angular/forms/signals';

/** The errors the `FormField` directive binds to a control. */
export type FormControlErrors = readonly ValidationError.WithOptionalFieldTree[];

/** Messages to show for a control: none before it was touched, and only errors that carry a message. */
export function visibleErrorMessages(errors: FormControlErrors, touched: boolean): string[] {
  if (!touched) {
    return [];
  }
  return errors.flatMap((error) => (error.message ? [error.message] : []));
}
