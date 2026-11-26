import { Component, computed, input } from '@angular/core';

/** One part of an `app-ui-stacked-bar`. */
export interface UiStackedBarSegment {
  /** Shown in the legend next to the value, e.g. "Zusagen". */
  label: string;
  value: number;
  /** A colour token of the app, e.g. `var(--status-yes)`. Never the only carrier of meaning. */
  color: string;
}

/**
 * How a whole splits into parts, as one bar with a legend below: e.g. the answers of a guest
 * list. The bar is decoration, the legend says every label and value in words.
 *
 * @example
 * <app-ui-stacked-bar
 *   label="Gäste nach Antwort"
 *   [segments]="[
 *     { label: 'Zusagen', value: 12, color: 'var(--status-yes)' },
 *     { label: 'Absagen', value: 3, color: 'var(--status-no)' },
 *     { label: 'Offen', value: 15, color: 'var(--status-open)' },
 *   ]"
 * />
 */
@Component({
  selector: 'app-ui-stacked-bar',
  styleUrl: './stacked-bar.scss',
  templateUrl: './stacked-bar.html',
})
export class UiStackedBar {
  readonly segments = input.required<readonly UiStackedBarSegment[]>();
  /** Names the legend for screen readers, e.g. "Gäste nach Antwort": the bar itself is hidden. */
  readonly label = input.required<string>();

  /** Segments with a value, each with its share of the bar in percent. */
  private readonly _parts = computed(() => {
    const segments = this.segments();
    const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
    return total === 0
      ? []
      : segments
          .filter((segment) => segment.value > 0)
          .map((segment) => ({ ...segment, share: (segment.value / total) * 100 }));
  });
}
