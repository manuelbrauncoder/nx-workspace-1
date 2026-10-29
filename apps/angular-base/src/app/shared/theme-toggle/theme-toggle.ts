import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { ThemeMode, ThemeService } from '@core/theme/theme.service';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './theme-toggle.scss',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  private readonly _theme = inject(ThemeService);

  private readonly _options: { mode: ThemeMode; labelKey: TranslationKey }[] = [
    { mode: 'light', labelKey: 'theme.light' },
    { mode: 'dark', labelKey: 'theme.dark' },
    { mode: 'system', labelKey: 'theme.system' },
  ];
}
