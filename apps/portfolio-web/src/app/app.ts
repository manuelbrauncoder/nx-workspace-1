import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, effect, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { UiToaster } from '@shared/ui/toast/toaster/toaster';

// The favicon follows the theme of the page like the logo tile: deep amber in light, bright amber
// in dark. `index.html` links the light one, the default theme.
const FAVICONS = { light: 'favicon.svg', dark: 'favicon-dark.svg' } as const;

@Component({
  imports: [RouterOutlet, UiToaster],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly _theme = inject(ThemeService);
  private readonly _document = inject(DOCUMENT);
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(() => {
      const href = FAVICONS[this._theme.resolved()];
      const icon = this._document.querySelector<HTMLLinkElement>(
        'link[rel="icon"][type="image/svg+xml"]',
      );
      if (this._isBrowser && icon && icon.getAttribute('href') !== href) {
        icon.setAttribute('href', href);
      }
    });
  }
}
