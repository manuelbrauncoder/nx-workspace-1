import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { Standing } from '../../application/game.store';
import { Dart, Player } from '../../domain/game';
import { formatDart } from '../format-dart';

/** Shown instead of the board once the game is won: the winner and the final standings. */
@Component({
  selector: 'app-game-result',
  imports: [RouterLink, TranslatePipe, UiButton, UiIcon, UiText],
  styleUrl: './game-result.scss',
  templateUrl: './game-result.html',
})
export class GameResult {
  readonly winner = input.required<Player>();
  readonly standings = input.required<Standing[]>();
  /** The winning turn; its last dart was the checkout. */
  readonly winningTurn = input.required<Dart[]>();
  readonly busy = input(false);

  readonly restart = output<void>();

  private readonly _checkout = computed(() => {
    const last = this.winningTurn().at(-1);
    return last ? formatDart(last) : null;
  });
}
