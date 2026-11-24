import { Directive, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

/**
 * `outline`: a quiet label with a thin border. `secondary`: on the soft secondary ground.
 * `tinted`: colours from `--badge-background`, `--badge-foreground` and `--badge-border`, which
 * the app sets, e.g. through a class per colour. Without them it looks like `secondary`.
 */
export type UiBadgeVariant = 'outline' | 'secondary' | 'tinted';

const BASE =
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>app-ui-icon]:text-[0.875rem]';
const VARIANTS: Record<UiBadgeVariant, string> = {
  outline: 'border-border text-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  tinted:
    'border-[var(--badge-border,transparent)] bg-[var(--badge-background,var(--secondary))] text-[var(--badge-foreground,var(--secondary-foreground))]',
};

/**
 * A short label next to a name, such as a role or a state ("Admin", "Du", "Vorbei"). Text, not a
 * control: the words carry the meaning, an icon inside is decoration. The Spartan badge brings
 * no variant this quiet, hence the own classes from theme tokens.
 *
 * @example
 * <span appUiBadge variant="secondary"><app-ui-icon name="shieldCheck" /> Admin</span>
 * <!-- the class sets --badge-background, --badge-foreground and --badge-border -->
 * <span class="tag--amber" appUiBadge variant="tinted">Work project</span>
 */
@Directive({
  selector: 'span[appUiBadge]',
  host: { 'data-slot': 'badge' },
})
export class UiBadge {
  readonly variant = input<UiBadgeVariant>('outline');

  constructor() {
    classes(() => [BASE, VARIANTS[this.variant()]]);
  }
}
