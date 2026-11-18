import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../application/auth.store';
import { SIGN_IN_PATH } from '../application/return-url';

export interface AccountActions {
  /** Opens the admin area. It is a feature of its own, so only its path is known here. */
  openAdmin(): Promise<void>;
  /** Signs out, confirms it with a toast and opens the sign-in page, or reports the failure. */
  signOut(): Promise<void>;
}

/**
 * The actions of the account menu, for every menu that offers them: `AccountMenu` and the
 * settings menu of the header. A menu renders its items in its own template, the CDK menu only
 * finds items there, so the items cannot be shared, only these actions. Call in an injection
 * context.
 */
export function injectAccountActions(): AccountActions {
  const store = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(UiToastService);
  const i18n = inject(I18nService);

  return {
    openAdmin: async () => {
      await router.navigateByUrl('/admin');
    },
    signOut: async () => {
      if (await store.signOut()) {
        toast.success(i18n.translate('auth.signedOut'));
        await router.navigateByUrl(SIGN_IN_PATH);
      } else {
        toast.error(i18n.translate('auth.signOutFailed'));
      }
    },
  };
}
