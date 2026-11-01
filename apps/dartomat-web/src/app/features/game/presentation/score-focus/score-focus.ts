import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { Checkout, Dart, Player } from '../../domain/game';
import { formatDart, formatRoute } from '../format-dart';

/** Darts per turn. */
const TURN_SLOTS = 3;

/** The current player, their remaining score, the checkout and the darts of the turn. */
@Component({
  selector: 'app-score-focus',
  imports: [TranslatePipe],
  styleUrl: './score-focus.scss',
  templateUrl: './score-focus.html',
})
export class ScoreFocus {
  readonly player = input.required<Player>();
  readonly checkout = input.required<Checkout>();
  readonly turnDarts = input.required<Dart[]>();

  private readonly _route = computed(() => this.checkout().route.map(formatDart));
  /** Read as one line, e.g. "T19 · D12". */
  private readonly _routeLabel = computed(() => formatRoute(this.checkout().route));
  private readonly _slots = computed(() =>
    Array.from({ length: TURN_SLOTS }, (_, i) => {
      const dart = this.turnDarts()[i];
      return { number: i + 1, label: dart ? formatDart(dart) : null };
    }),
  );
}
