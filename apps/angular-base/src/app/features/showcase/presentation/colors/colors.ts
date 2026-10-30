import { afterRenderEffect, Component, DOCUMENT, inject, signal } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { ThemeService } from '@core/theme/theme.service';
import { UiText } from '@shared/ui/text/text';
import { ShowcaseSection } from '../showcase-section/showcase-section';
import { ColorSwatch } from './color-swatch/color-swatch';
import { COLOR_GROUPS } from './color-tokens';

@Component({
  selector: 'app-showcase-colors',
  imports: [TranslatePipe, UiText, ShowcaseSection, ColorSwatch],
  styleUrl: './colors.scss',
  templateUrl: './colors.html',
})
export class Colors {
  private readonly _theme = inject(ThemeService);
  private readonly _document = inject(DOCUMENT);

  private readonly _groups = COLOR_GROUPS;
  private readonly _values = signal<Record<string, string>>({});

  constructor() {
    // Browser only. Re-reads the custom properties whenever the theme switches.
    afterRenderEffect({
      read: () => {
        this._theme.resolved();
        const styles = getComputedStyle(this._document.documentElement);
        const names = this._groups.flatMap((group) => group.tokens.map((token) => token.name));
        this._values.set(
          Object.fromEntries(
            names.map((name) => [name, styles.getPropertyValue(`--${name}`).trim()]),
          ),
        );
      },
    });
  }

  private _schemeKey(): TranslationKey {
    return this._theme.resolved() === 'dark' ? 'theme.dark' : 'theme.light';
  }
}
