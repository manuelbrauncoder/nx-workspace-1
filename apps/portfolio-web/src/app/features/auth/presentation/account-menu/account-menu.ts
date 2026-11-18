import { booleanAttribute, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { SIGN_IN_PATH } from '../../application/return-url';

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
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _signInPath = SIGN_IN_PATH;

  /** The admin area is a feature of its own, so only its path is known here. */
  private async _openAdmin(): Promise<void> {
    await this._router.navigateByUrl('/admin');
  }

  private async _signOut(): Promise<void> {
    if (await this._store.signOut()) {
      this._toast.success(this._i18n.translate('auth.signedOut'));
      await this._router.navigateByUrl(SIGN_IN_PATH);
    } else {
      this._toast.error(this._i18n.translate('auth.signOutFailed'));
    }
  }
}
