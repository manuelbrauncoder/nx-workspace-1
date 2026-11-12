import { Component, inject, input } from '@angular/core';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { UiToastPosition, UiToastService } from '../toast.service';

/**
 * Outlet for the toasts of `UiToastService`. Rendered exactly once, in the root component.
 *
 * @example
 * <app-ui-toaster [theme]="theme.resolved()" />
 */
@Component({
  selector: 'app-ui-toaster',
  imports: [HlmToasterImports],
  styleUrl: './toaster.scss',
  templateUrl: './toaster.html',
})
export class UiToaster {
  /** Color scheme of the toasts, bound to the resolved app theme. */
  readonly theme = input<'light' | 'dark'>('light');
  /** Default corner for all toasts. A single toast can override it through its options. */
  readonly position = input<UiToastPosition>('top-right');

  private readonly _toasts = inject(UiToastService);
}
