import { computed, inject, Signal } from '@angular/core';
import { TranslationKey } from '@core/i18n/translation-key';
import { AuthStore } from '@features/auth/public-api';
import { UiNavMenuItem } from '@shared/ui/nav-menu/nav-menu';

export interface AppNavItem {
  /** Absolute route path. */
  path: string;
  labelKey: TranslationKey;
}

/** Navigation of a signed-in account. */
export const APP_NAV_ITEMS: UiNavMenuItem[] = [{ labelKey: 'layout.nav.events', path: '/events' }];

/** Added for admins. */
export const ADMIN_NAV_ITEMS: UiNavMenuItem[] = [
  { labelKey: 'layout.nav.accounts', path: '/admin' },
];

/**
 * Single source for the navigation in the header and in the mobile drawer. Empty while nobody is
 * signed in, header and drawer then show no navigation.
 */
export function injectAppNavItems(): Signal<UiNavMenuItem[]> {
  const auth = inject(AuthStore);
  return computed(() => {
    if (!auth.isSignedIn()) {
      return [];
    }
    return auth.isAdmin() ? [...APP_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : APP_NAV_ITEMS;
  });
}

/** Links to the legal pages in the footer. */
export const APP_FOOTER_ITEMS: AppNavItem[] = [
  { path: '/imprint', labelKey: 'layout.footer.imprint' },
  { path: '/privacy', labelKey: 'layout.footer.privacy' },
  { path: '/accessibility', labelKey: 'layout.footer.accessibility' },
];
