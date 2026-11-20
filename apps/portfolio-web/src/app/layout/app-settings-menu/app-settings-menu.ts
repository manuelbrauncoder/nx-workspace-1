import { afterNextRender, Component, DestroyRef, DOCUMENT, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ThemeService } from '@core/theme/theme.service';
import { AuthStore, injectAccountActions } from '@features/auth/public-api';
import { LANGUAGE_MENU_OPTIONS } from '@shared/language-toggle/language-toggle';
import { THEME_MENU_OPTIONS } from '@shared/theme-toggle/theme-toggle';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiNavMenuLink } from '@shared/ui/nav-menu/nav-menu';
import { APP_NAV_ITEMS } from '../app-nav-items';

/** Below `md` the header shows no links, the menu takes them over. */
const COMPACT_QUERY = '(max-width: 47.999rem)';

/**
 * One settings button in the header instead of several icons: its menu holds the account (only
 * while signed in), the language and the theme, and below `md` the links to the sections of the
 * start page first. All items stand in this template, because the CDK menu only finds items in
 * the template of the menu.
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
  private readonly _navItems = APP_NAV_ITEMS;
  private readonly _router = inject(Router);
  /** Whether the screen is narrower than `md`. Hidden items would still take arrow key stops. */
  private readonly _compact = signal(false);

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const query = view?.matchMedia?.(COMPACT_QUERY);
      if (!query) {
        return;
      }
      const update = (): void => this._compact.set(query.matches);
      update();
      query.addEventListener('change', update);
      destroyRef.onDestroy(() => query.removeEventListener('change', update));
    });
  }

  /** The shell moves focus to the section once the navigation ends. */
  private _open(item: UiNavMenuLink): void {
    void this._router.navigate([item.path], { fragment: item.fragment });
  }
}
