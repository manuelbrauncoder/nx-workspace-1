import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_VERSION } from '@core/app-version';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiIcon } from '@shared/ui/icon/icon';
import { AppLogo } from '../app-logo/app-logo';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-footer',
  imports: [AppLogo, RouterLink, RouterLinkActive, TranslatePipe, UiIcon],
  styleUrl: './app-footer.scss',
  templateUrl: './app-footer.html',
})
export class AppFooter {
  private readonly _items = APP_FOOTER_ITEMS;
  private readonly _version = inject(APP_VERSION);
}
