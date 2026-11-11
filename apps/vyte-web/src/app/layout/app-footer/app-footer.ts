import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { APP_VERSION } from '@core/app-version';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  styleUrl: './app-footer.scss',
  templateUrl: './app-footer.html',
})
export class AppFooter {
  private readonly _appName = inject(APP_NAME);
  private readonly _version = inject(APP_VERSION);
  private readonly _year = new Date().getFullYear();
  private readonly _items = APP_FOOTER_ITEMS;
}
