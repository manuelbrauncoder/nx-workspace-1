import { booleanAttribute, Component, computed, HOST_TAG_NAME, inject, input } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { buttonVariants } from '@spartan-ng/helm/button';
import { classes, hlm } from '@spartan-ng/helm/utils';
import { UiSpinner } from '../spinner/spinner';

export type UiButtonVariant =
  'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link' | 'brand';

/**
 * The brand color of the app for the one main action of a page, from the tokens `--brand` and
 * `--brand-foreground` of its theme. Spartan has no such variant.
 */
const BRAND_CLASSES = 'bg-brand text-brand-foreground font-bold hover:bg-brand/85';
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
 * <a appUiButton variant="brand" size="lg" routerLink="/" fragment="projects">Projekte</a>
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
    // A loading button keeps the focus: a natively disabled one drops it to the body.
    '[attr.disabled]': "!_isAnchor && disabled() ? '' : null",
    '[attr.aria-disabled]': "_blocked() ? 'true' : null",
    '[attr.data-disabled]': "_blocked() ? '' : null",
    '[attr.tabindex]': '_isAnchor && disabled() ? -1 : null',
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

  private readonly _i18n = inject(I18nService);
  private readonly _isAnchor = inject(HOST_TAG_NAME) === 'a';
  private readonly _blocked = computed(() => this.disabled() || this.loading());
  private readonly _loadingText = computed(
    () => this.loadingLabel() ?? this._i18n.translate('common.loading'),
  );

  constructor() {
    classes(() => {
      const variant = this.variant();
      // `hlm` merges the colors of the default variant away, so only the brand colors stay.
      return variant === 'brand'
        ? hlm(buttonVariants({ variant: 'default', size: this.size() }), BRAND_CLASSES)
        : buttonVariants({ variant, size: this.size() });
    });
  }

  /**
   * Blocked buttons swallow the click: a link has no `disabled` attribute, and a loading button
   * keeps `aria-disabled` only, so its form submit has to be stopped here.
   */
  private _onClick(event: Event): void {
    if (this._blocked()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
