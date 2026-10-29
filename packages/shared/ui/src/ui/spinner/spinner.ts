import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

/**
 * Loading indicator, announced to screen readers through `label`. Sized by its font size.
 *
 * @example
 * <app-ui-spinner label="Notiz wird geladen" />
 */
@Component({
  selector: 'app-ui-spinner',
  imports: [HlmSpinnerImports],
  styleUrl: './spinner.scss',
  templateUrl: './spinner.html',
})
export class UiSpinner {
  /** Announced to screen readers. Defaults to a generic "loading" text. */
  readonly label = input<string>();

  private readonly _i18n = inject(I18nService);

  private readonly _resolvedLabel = computed(
    () => this.label() ?? this._i18n.translate('common.loading'),
  );
}
