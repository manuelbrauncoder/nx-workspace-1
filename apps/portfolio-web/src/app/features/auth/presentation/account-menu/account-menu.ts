import { booleanAttribute, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { AuthStore } from '../../application/auth.store';
import { SIGN_IN_PATH } from '../../application/return-url';
import { injectAccountActions } from '../account-actions';

/**
 * The account: a link to the sign-in page, or the signed-in user with "administration" and
 * "sign out". In the header a menu, in the mobile drawer a plain list (`layout="list"`), because
 * a menu inside the drawer would be a popup inside a popup. Its texts are in the shared scope,
 * because it is on every page.
 */
@Component({
  selector: 'app-account-menu',
  imports: [RouterLink, TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './account-menu.scss',
  templateUrl: './account-menu.html',
})
export class AccountMenu {
  /**
   * Whether a signed-out visitor sees the link to the sign-in page. A public site turns it off,
   * the sign-in page stays reachable through its URL.
   */
  readonly showSignIn = input(true, { transform: booleanAttribute });
  /** `menu` opens from an icon button, `list` shows the entries right away. */
  readonly layout = input<'menu' | 'list'>('menu');

  private readonly _store = inject(AuthStore);
  private readonly _actions = injectAccountActions();

  private readonly _signInPath = SIGN_IN_PATH;

  private async _openAdmin(): Promise<void> {
    await this._actions.openAdmin();
  }

  private async _signOut(): Promise<void> {
    await this._actions.signOut();
  }
}
