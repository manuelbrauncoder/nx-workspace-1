import { Component, Directive, input } from '@angular/core';
import { HlmAlertAction, HlmAlertImports } from '@spartan-ng/helm/alert';

export type UiAlertVariant = 'default' | 'destructive';

/**
 * Inline message with a heading, announced to screen readers as soon as it appears. The
 * projected content is the description. An optional `appUiAlertAction` button sits in the top
 * corner. To show a `Failure`, use `app-failure-alert` instead.
 *
 * @example
 * <app-ui-alert heading="Speichern fehlgeschlagen" variant="destructive">
 *   Der Server ist nicht erreichbar.
 *   <button appUiAlertAction appUiButton variant="outline" size="sm" type="button">
 *     Erneut versuchen
 *   </button>
 * </app-ui-alert>
 */
@Component({
  selector: 'app-ui-alert',
  imports: [HlmAlertImports],
  styleUrl: './alert.scss',
  templateUrl: './alert.html',
})
export class UiAlert {
  readonly heading = input.required<string>();
  readonly variant = input<UiAlertVariant>('default');
}

/** Marks the action button of an `app-ui-alert`. */
@Directive({
  selector: '[appUiAlertAction]',
  hostDirectives: [HlmAlertAction],
})
export class UiAlertAction {}
