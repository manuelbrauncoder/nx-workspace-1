import { booleanAttribute, Component, computed, inject, input, output } from '@angular/core';
import { Failure } from '@core/failure/failure';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiAlert, UiAlertAction, UiHeadingLevel } from '../ui/alert/alert';
import { UiButton } from '../ui/button/button';

/**
 * Inline presentation of a `Failure`, optionally with a retry button. The text is the translated
 * one for the kind of failure, unless the page passes its own `message`.
 */
@Component({
  selector: 'app-failure-alert',
  imports: [TranslatePipe, UiAlert, UiAlertAction, UiButton],
  styleUrl: './failure-alert.scss',
  templateUrl: './failure-alert.html',
})
export class FailureAlert {
  readonly heading = input.required<string>();
  readonly failure = input.required<Failure>();
  /** Replaces the generic text, e.g. "wrong email or password" for a 401 at sign-in. */
  readonly message = input<string>();
  readonly retryable = input(false, { transform: booleanAttribute });
  /** Level of the heading in the page outline, see `UiAlert`. */
  readonly headingLevel = input<UiHeadingLevel>(2);

  readonly retry = output<void>();

  private readonly _i18n = inject(I18nService);

  private readonly _text = computed(
    () => this.message() ?? this._i18n.translate(`failure.${this.failure().kind}`),
  );
}
