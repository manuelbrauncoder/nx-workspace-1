import { Component, inject } from '@angular/core';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { I18nService } from '../i18n.service';
import { APP_LANGUAGE_CODES, APP_LANGUAGES } from '../languages';
import { TranslatePipe } from '../translate.pipe';

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
