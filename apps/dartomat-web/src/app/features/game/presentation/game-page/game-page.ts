import { Component, computed, DOCUMENT, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { GameStore } from '../../application/game.store';
import { DartThrow } from '../../domain/game';
import { DartKeypad } from '../dart-keypad/dart-keypad';
import { GameMenu } from '../game-menu/game-menu';
import { GameNotFound } from '../game-not-found/game-not-found';
import { GameResult } from '../game-result/game-result';
import { PlayerStrip } from '../player-strip/player-strip';
import { ScoreFocus } from '../score-focus/score-focus';

/** A game on `/game/:id`: scores, the current player, the keypad and the options. */
@Component({
  selector: 'app-game-page',
  imports: [
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiButton,
    UiIcon,
    DartKeypad,
    GameMenu,
    GameNotFound,
    GameResult,
    PlayerStrip,
    ScoreFocus,
  ],
  styleUrl: './game-page.scss',
  templateUrl: './game-page.html',
})
export class GamePage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(GameStore);
  private readonly _router = inject(Router);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);
  private readonly _document = inject(DOCUMENT);

  private readonly _menuOpen = signal(false);

  private readonly _finish = computed(() =>
    this._i18n.translate(
      this._store.game()?.doubleOut ? 'gamePage.doubleOut' : 'gamePage.straightOut',
    ),
  );
  private readonly _heading = computed(() =>
    this._i18n.translate('gamePage.heading', { finish: this._finish() }),
  );

  constructor() {
    effect(() => this._store.load(this.id()));
  }

  private _throw(dart: DartThrow): void {
    void this._store.throwDart(dart);
  }

  private async _copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._document.location.href);
      this._toast.success(this._i18n.translate('gamePage.menu.linkCopied'));
    } catch {
      this._toast.error(this._i18n.translate('gamePage.menu.copyFailed'));
    }
  }

  /** From the menu the current score is lost, so it asks first. */
  private async _restartFromMenu(): Promise<void> {
    this._menuOpen.set(false);
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('gamePage.restart.heading'),
      description: this._i18n.translate('gamePage.restart.description', {
        score: this._store.game()?.startScore ?? 301,
      }),
      confirmLabel: this._i18n.translate('gamePage.restart.confirm'),
      cancelLabel: this._i18n.translate('gamePage.restart.cancel'),
    });
    if (confirmed) {
      await this._store.restart();
    }
  }

  private async _quit(): Promise<void> {
    this._menuOpen.set(false);
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('gamePage.abort.heading'),
      description: this._i18n.translate('gamePage.abort.description'),
      confirmLabel: this._i18n.translate('gamePage.abort.confirm'),
      cancelLabel: this._i18n.translate('gamePage.abort.cancel'),
      variant: 'destructive',
    });
    if (confirmed) {
      await this._router.navigate(['/setup']);
    }
  }
}
