import { Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { ThemeMode, ThemeService } from '@core/theme/theme.service';
import { UiButton } from '../ui/button/button';
import { UiIcon } from '../ui/icon/icon';
import { UiMenuImports } from '../ui/menu/menu';

/**
 * The theme modes for a menu, with the keys of their labels. A menu with more than the themes
 * (e.g. a settings menu) renders them as `appUiMenuRadio` items in its own template, the CDK menu
 * only finds items there.
 */
export const THEME_MENU_OPTIONS: readonly { mode: ThemeMode; labelKey: TranslationKey }[] = [
  { mode: 'light', labelKey: 'theme.light' },
  { mode: 'dark', labelKey: 'theme.dark' },
  { mode: 'system', labelKey: 'theme.system' },
];

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './theme-toggle.scss',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  /** `lg` for a touch screen, e.g. in the mobile drawer: a 48px button with a 24px icon. */
  readonly size = input<'default' | 'lg'>('default');

  private readonly _theme = inject(ThemeService);

  private readonly _options = THEME_MENU_OPTIONS;
}
