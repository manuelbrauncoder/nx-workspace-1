import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

/**
 * Frame of the pages a guest opens through a link (`/rsvp/…`, later save the date and uploads):
 * the yellow ground of the Konfetti design, the wordmark, the page and the legal links. No
 * navigation and no sign-in, a guest has no account.
 */
@Component({
  selector: 'app-guest-shell',
  imports: [RouterLink, RouterOutlet, TranslatePipe],
  styleUrl: './guest-shell.scss',
  templateUrl: './guest-shell.html',
})
export class GuestShell {
  /** Written in lower case, as in the header of the app. Not a link: the page is the guest's. */
  private readonly _wordmark = inject(APP_NAME).toLowerCase();
  private readonly _items = APP_FOOTER_ITEMS;
}
