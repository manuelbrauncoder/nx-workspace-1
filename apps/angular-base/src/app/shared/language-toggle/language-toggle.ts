import { Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { APP_LANGUAGE_CODES, APP_LANGUAGES } from '@core/i18n/languages';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';

@Component({
  selector: 'app-language-toggle',
  imports: [UiButton, UiIcon, UiMenuImports, TranslatePipe],
  styleUrl: './language-toggle.scss',
  templateUrl: './language-toggle.html',
})
export class LanguageToggle {
  private readonly _i18n = inject(I18nService);

  /** The labels are the names of the languages in the language itself, so they are not translated. */
  private readonly _options = APP_LANGUAGE_CODES.map((language) => ({
    language,
    label: APP_LANGUAGES[language].label,
  }));
}
