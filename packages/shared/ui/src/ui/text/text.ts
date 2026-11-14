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
  | 'display'
  | 'section'
  | 'title'
  | 'page'
  | 'heading'
  | 'item'
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

// Display sizes of the start page. Spartan has no variants this large, they scale with the
// viewport between a phone and a wide screen. The leading comes after the size, a font size
// class would otherwise merge it away.
const DISPLAY =
  'font-heading font-extrabold tracking-[-0.04em] text-[clamp(4rem,11.5vw,10.5rem)] leading-[0.88]';
const SECTION =
  'font-heading font-extrabold tracking-[-0.03em] text-[clamp(2.625rem,6vw,4.5rem)] leading-none';
const TITLE =
  'font-heading font-extrabold tracking-[-0.025em] text-[clamp(1.875rem,3vw,2.5rem)] leading-[1.05]';

// Work pages, where a page title and its section headings should not shout: a smaller title in
// the heading font, section headings in the text font.
const PAGE =
  'font-heading font-extrabold tracking-[-0.02em] text-[1.875rem] leading-tight sm:text-[2.25rem]';
const HEADING = 'font-sans text-xl font-semibold tracking-tight';
// The title of one entry in a list or panel of a work page, e.g. a guest or an account.
const ITEM = 'font-sans text-base font-semibold leading-snug';

const VARIANT_CLASSES: Record<UiTextVariant, string> = {
  display: DISPLAY,
  section: SECTION,
  title: TITLE,
  page: PAGE,
  heading: HEADING,
  item: ITEM,
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
 * <h2 appUiText="section">Projekte</h2>
 * <h1 appUiText="page">Gäste</h1> <!-- title of a work page, `heading` for its sections -->
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
