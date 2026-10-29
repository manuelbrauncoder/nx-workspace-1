import { Directive, input } from '@angular/core';
import {
  hlmBlockquote,
  hlmCode,
  hlmH1,
  hlmH2,
  hlmH3,
  hlmH4,
  hlmLarge,
  hlmLead,
  hlmMuted,
  hlmP,
  hlmSmall,
  hlmUl,
} from '@spartan-ng/helm/typography';
import { classes } from '@spartan-ng/helm/utils';

export type UiTextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  | 'lead'
  | 'large'
  | 'small'
  | 'muted'
  | 'code'
  | 'blockquote'
  | 'list';

const VARIANT_CLASSES: Record<UiTextVariant, string> = {
  h1: hlmH1,
  h2: hlmH2,
  h3: hlmH3,
  h4: hlmH4,
  p: hlmP,
  lead: hlmLead,
  large: hlmLarge,
  small: hlmSmall,
  muted: hlmMuted,
  code: hlmCode,
  blockquote: hlmBlockquote,
  list: hlmUl,
};

/**
 * Typography style for a native element. The element decides the semantics, the variant only
 * the look, so an `h2` may look like an `h3`. Classes on the element win over the variant.
 *
 * @example
 * <h1 appUiText="h1">Notizen</h1>
 * <p class="mt-2" appUiText="lead">Kurze Einleitung zur Seite.</p>
 * <ul appUiText="list"><li>Eintrag</li></ul>
 */
@Directive({
  selector: '[appUiText]',
})
export class UiText {
  readonly variant = input.required<UiTextVariant>({ alias: 'appUiText' });

  constructor() {
    classes(() => VARIANT_CLASSES[this.variant()]);
  }
}
