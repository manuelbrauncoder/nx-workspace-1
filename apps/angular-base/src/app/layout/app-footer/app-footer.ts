import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { APP_FOOTER_ITEMS } from '../app-nav-items';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  styleUrl: './app-footer.scss',
  templateUrl: './app-footer.html',
})
export class AppFooter {
  private readonly _appName = APP_NAME;
  private readonly _year = new Date().getFullYear();
  private readonly _items = APP_FOOTER_ITEMS;
}
