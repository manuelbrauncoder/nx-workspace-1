import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectResponseStatus } from '@core/http/response-status';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';

/** Shown on `/game/:id` when the API does not know the game. The server answers with 404. */
@Component({
  selector: 'app-game-not-found',
  imports: [RouterLink, TranslatePipe, UiButton, UiIcon, UiText],
  styleUrl: './game-not-found.scss',
  templateUrl: './game-not-found.html',
})
export class GameNotFound {
  constructor() {
    injectResponseStatus()(404);
  }
}
