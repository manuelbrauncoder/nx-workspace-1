import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AuthStore } from '@features/auth/public-api';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';

/**
 * The start page: what vyte is and the way to the sign-in. A placeholder until the events
 * feature exists, a signed-in user then lands on their events instead.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe, UiButton, UiText],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly _auth = inject(AuthStore);
}
