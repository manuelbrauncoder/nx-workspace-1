import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectResponseStatus } from '@core/http/response-status';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';

/** Page of the `**` route. The server delivers it with status 404. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslatePipe, UiButton, UiIcon, UiText],
  styleUrl: './not-found.scss',
  templateUrl: './not-found.html',
})
export class NotFound {
  constructor() {
    injectResponseStatus()(404);
  }
}
