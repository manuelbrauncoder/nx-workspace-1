import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, maxLength, submit, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { APP_VERSION } from '@core/app-version';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormToggleGroup } from '@shared/form-controls/form-toggle-group/form-toggle-group';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { SetupStore } from '../../application/setup.store';
import { PLAYER_NAME_MAX_LENGTH, PLAYERS_MAX } from '../../domain/setup';

type Finish = 'double' | 'straight';

/** Choosing the players and the finish on `/setup`, then starting the game. */
@Component({
  selector: 'app-setup-page',
  imports: [
    FormField,
    TranslatePipe,
    FailureAlert,
    FormText,
    FormToggleGroup,
    UiButton,
    UiIcon,
    UiText,
  ],
  styleUrl: './setup-page.scss',
  templateUrl: './setup-page.html',
})
export class SetupPage {
  private readonly _store = inject(SetupStore);
  private readonly _router = inject(Router);
  private readonly _i18n = inject(I18nService);

  private readonly _playersMax = PLAYERS_MAX;
  private readonly _version = inject(APP_VERSION);

  /** Enter in the field adds the player. */
  private readonly _newPlayer = signal({ name: '' });
  private readonly _playerForm = form(this._newPlayer, (path) => {
    // Messages are functions, so a visible error follows the language.
    maxLength(path.name, PLAYER_NAME_MAX_LENGTH, {
      message: () =>
        this._i18n.translate('setupPage.validation.tooLong', { max: PLAYER_NAME_MAX_LENGTH }),
    });
    validate(path.name, ({ value }) =>
      this._store.hasPlayer(value())
        ? {
            kind: 'duplicate',
            message: this._i18n.translate('setupPage.validation.duplicate'),
          }
        : undefined,
    );
  });

  private readonly _rules = signal<{ finish: Finish }>({ finish: 'double' });
  private readonly _rulesForm = form(this._rules);

  /** Computed, so the labels follow the language. */
  private readonly _finishes = computed(() => [
    { value: 'double' as const, label: this._i18n.translate('setupPage.finish.double') },
    { value: 'straight' as const, label: this._i18n.translate('setupPage.finish.straight') },
  ]);
  private readonly _finishHint = computed(() =>
    this._i18n.translate(
      this._rules().finish === 'double'
        ? 'setupPage.finish.doubleHint'
        : 'setupPage.finish.straightHint',
    ),
  );

  private readonly _starting = computed(
    () => this._store.mutationState().loadingState === 'loading',
  );
  private readonly _playerCount = computed(() => {
    const count = this._store.players().length;
    return count === 1
      ? this._i18n.translate('setupPage.playerCountOne')
      : this._i18n.translate('setupPage.playerCountOther', { count });
  });

  constructor() {
    afterNextRender(() => this._store.loadRecent());
  }

  private async _addPlayer(event: Event): Promise<void> {
    event.preventDefault();
    const added = await submit(this._playerForm, async () => {
      this._store.addPlayer(this._newPlayer().name);
    });
    // Cleared after the submission: a value set while it runs does not reach the input.
    if (added) {
      this._newPlayer.set({ name: '' });
      this._playerForm().reset();
    }
  }

  private async _start(): Promise<void> {
    const game = await this._store.start(this._rules().finish === 'double');
    if (game) {
      await this._router.navigate(['/game', game.id]);
    }
  }
}
