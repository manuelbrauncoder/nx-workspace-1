import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  contentChild,
  effect,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { injectResponseStatus } from '@core/http/response-status';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncState } from '@core/state/async-state';
import { FailureAlert } from '../failure-alert/failure-alert';
import type { UiHeadingLevel } from '../ui/alert/alert';
import { UiSkeleton } from '../ui/skeleton/skeleton';
import { UiSpinner } from '../ui/spinner/spinner';

/**
 * Renders an `AsyncState`: a spinner or skeleton while loading, a failure alert on failure, and otherwise
 * the projected `<ng-template>`. The template is only instantiated once there is content to
 * show, so it can rely on the data being loaded. `idle` counts as content, for pages that have
 * nothing to load. A failure also becomes the HTTP status of the server-rendered page, so a page
 * that could not load its data is never delivered as 200.
 */
@Component({
  selector: 'app-async-content',
  imports: [NgTemplateOutlet, TranslatePipe, FailureAlert, UiSkeleton, UiSpinner],
  styleUrl: './async-content.scss',
  templateUrl: './async-content.html',
  host: {
    '[attr.aria-busy]': "state().loadingState === 'loading'",
  },
})
export class AsyncContent {
  readonly state = input.required<AsyncState>();
  readonly failureHeading = input.required<string>();
  /** What to show while loading. */
  readonly loadingIndicator = input<'spinner' | 'skeleton'>('spinner');
  /** Announced to screen readers while loading. Defaults to a generic "loading" text. */
  readonly loadingLabel = input<string>();
  readonly retryable = input(false, { transform: booleanAttribute });
  /** Level of the heading of the failure in the page outline, see `UiAlert`. */
  readonly failureHeadingLevel = input<UiHeadingLevel>(2);

  readonly retry = output<void>();

  private readonly _content = contentChild.required(TemplateRef);

  private readonly _setResponseStatus = injectResponseStatus();

  constructor() {
    effect(() => {
      const failure = this.state().failure;
      if (failure) {
        // A failure without a usable status, e.g. an unreachable backend, counts as unavailable.
        this._setResponseStatus(failure.status && failure.status >= 400 ? failure.status : 503);
      }
    });
  }
}
