import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

/**
 * Frame of the pages a guest opens through a link (`/rsvp/…`, later save the date and uploads):
 * the yellow ground of the Konfetti design, the logo, the page and the legal links. No
 * navigation and no sign-in, a guest has no account.
 */
@Component({
  selector: 'app-guest-shell',
  imports: [NgOptimizedImage, RouterLink, RouterOutlet, TranslatePipe],
  styleUrl: './guest-shell.scss',
  templateUrl: './guest-shell.html',
})
export class GuestShell {
  /** Alt text of the logo. Not a link: the page is the guest's. */
  private readonly _appName = inject(APP_NAME);
  private readonly _items = APP_FOOTER_ITEMS;
}
