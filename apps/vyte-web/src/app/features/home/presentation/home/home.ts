import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';

/**
 * The start page for visitors: what vyte is and the way to the sign-in. A signed-in user never
 * sees it, `visitorsOnlyGuard` sends them to their events.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe, UiButton, UiText],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
