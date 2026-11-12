import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { SIGN_IN_PATH } from '../../application/return-url';

/**
 * The account in the header: a link to the sign-in page, or a menu with the signed-in user and
 * "sign out". Its texts are in the shared scope, because it is on every page.
 */
@Component({
  selector: 'app-account-menu',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './account-menu.scss',
  templateUrl: './account-menu.html',
})
export class AccountMenu {
  private readonly _store = inject(AuthStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _signInPath = SIGN_IN_PATH;

  private async _openAdmin(): Promise<void> {
    await this._router.navigateByUrl('/admin/users');
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
