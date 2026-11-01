import { afterRenderEffect, Component, ElementRef, input, viewChildren } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { Player } from '../../domain/game';

/**
 * The scores of all players in a row that scrolls sideways. The current player is marked and
 * scrolled into view when the turn passes on.
 */
@Component({
  selector: 'app-player-strip',
  imports: [TranslatePipe],
  styleUrl: './player-strip.scss',
  templateUrl: './player-strip.html',
})
export class PlayerStrip {
  readonly players = input.required<Player[]>();
  /** `null` while nobody is up, e.g. after the game is won. */
  readonly currentIdx = input<number | null>(null);

  private readonly _items = viewChildren<ElementRef<HTMLElement>>('item');

  constructor() {
    afterRenderEffect(() => {
      const idx = this.currentIdx();
      const item = idx === null ? undefined : this._items()[idx];
      item?.nativeElement.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    });
  }
}
