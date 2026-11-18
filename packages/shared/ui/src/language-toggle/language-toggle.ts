import { Component, inject, input } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { APP_LANGUAGE_CODES, APP_LANGUAGES } from '@core/i18n/languages';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '../ui/button/button';
import { UiIcon } from '../ui/icon/icon';
import { UiMenuImports } from '../ui/menu/menu';

/**
 * The languages for a menu. The labels are the names of the languages in the language itself, so
 * they are not translated. A menu with more than the languages (e.g. a settings menu) renders
 * them as `appUiMenuRadio` items in its own template, the CDK menu only finds items there.
 */
export const LANGUAGE_MENU_OPTIONS = APP_LANGUAGE_CODES.map((language) => ({
  language,
  label: APP_LANGUAGES[language].label,
}));

@Component({
  selector: 'app-language-toggle',
  imports: [UiButton, UiIcon, UiMenuImports, TranslatePipe],
  styleUrl: './language-toggle.scss',
  templateUrl: './language-toggle.html',
})
export class LanguageToggle {
  /** `lg` for a touch screen, e.g. in the mobile drawer: a 48px button with a 24px icon. */
  readonly size = input<'default' | 'lg'>('default');

  private readonly _i18n = inject(I18nService);

  private readonly _options = LANGUAGE_MENU_OPTIONS;
}
