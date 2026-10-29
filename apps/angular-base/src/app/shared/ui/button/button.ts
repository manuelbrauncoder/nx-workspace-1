import { booleanAttribute, Component, computed, HOST_TAG_NAME, inject, input } from '@angular/core';
import { buttonVariants } from '@spartan-ng/helm/button';
import { classes } from '@spartan-ng/helm/utils';
import { UiSpinner } from '../spinner/spinner';

export type UiButtonVariant =
  'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type UiButtonSize =
  'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

/**
 * Button look and behavior for a native `button` or `a`, so `type`, `routerLink` and ARIA
 * attributes keep working as usual. While `loading` it shows a spinner and cannot be activated.
 * An icon-only button needs an `aria-label`.
 *
 * @example
 * <button appUiButton type="submit" [loading]="saving()" loadingLabel="Wird gespeichert">
 *   Speichern
 * </button>
 * <a appUiButton variant="outline" size="sm" routerLink="/notes">Abbrechen</a>
 * <button appUiButton variant="ghost" size="icon" type="button" aria-label="Hinzufügen">
 *   <app-ui-icon name="plus" />
 * </button>
 */
@Component({
  selector: 'button[appUiButton], a[appUiButton]',
  imports: [UiSpinner],
  styleUrl: './button.scss',
  templateUrl: './button.html',
  host: {
    'data-slot': 'button',
    '[attr.disabled]': "!_isAnchor && _blocked() ? '' : null",
    '[attr.aria-disabled]': "_isAnchor && _blocked() ? 'true' : null",
    '[attr.data-disabled]': "_blocked() ? '' : null",
    '[attr.tabindex]': '_isAnchor && _blocked() ? -1 : null',
    '[attr.aria-busy]': "loading() ? 'true' : null",
    '(click)': '_onClick($event)',
  },
})
export class UiButton {
  readonly variant = input<UiButtonVariant>('default');
  readonly size = input<UiButtonSize>('default');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shows a spinner in front of the content and blocks the button. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Announced to screen readers while `loading`. Defaults to a generic "loading" text. */
  readonly loadingLabel = input<string>();

  private readonly _isAnchor = inject(HOST_TAG_NAME) === 'a';
  private readonly _blocked = computed(() => this.disabled() || this.loading());

  constructor() {
    classes(() => buttonVariants({ variant: this.variant(), size: this.size() }));
  }

  /** A link has no `disabled` attribute, so a blocked one has to swallow the click itself. */
  private _onClick(event: Event): void {
    if (this._isAnchor && this._blocked()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
