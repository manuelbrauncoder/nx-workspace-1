import { Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ThemeService } from '@core/theme/theme.service';
import { AuthStore, injectAccountActions } from '@features/auth/public-api';
import { LANGUAGE_MENU_OPTIONS } from '@shared/language-toggle/language-toggle';
import { THEME_MENU_OPTIONS } from '@shared/theme-toggle/theme-toggle';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';

/**
 * One gear button in the header instead of three icons: its menu holds the account (only while
 * signed in), the language and the theme. The mobile drawer shows the same as a list. All items
 * stand in this template, because the CDK menu only finds items in the template of the menu.
 */
@Component({
  selector: 'app-settings-menu',
  imports: [TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './app-settings-menu.scss',
  templateUrl: './app-settings-menu.html',
})
export class AppSettingsMenu {
  private readonly _auth = inject(AuthStore);
  private readonly _account = injectAccountActions();
  private readonly _i18n = inject(I18nService);
  private readonly _theme = inject(ThemeService);

  private readonly _languages = LANGUAGE_MENU_OPTIONS;
  private readonly _themes = THEME_MENU_OPTIONS;
}
