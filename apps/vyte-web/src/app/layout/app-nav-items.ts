import { TranslationKey } from '@core/i18n/translation-key';
import { UiNavMenuItem } from '@shared/ui/nav-menu/nav-menu';

export interface AppNavItem {
  /** Absolute route path. */
  path: string;
  labelKey: TranslationKey;
}

/**
 * Single source for the navigation in the header and in the mobile drawer. Empty until the first
 * feature with a page of its own exists, header and drawer then show no navigation.
 */
export const APP_NAV_ITEMS: UiNavMenuItem[] = [];

/** Links to the legal pages in the footer. */
export const APP_FOOTER_ITEMS: AppNavItem[] = [
  { path: '/imprint', labelKey: 'layout.footer.imprint' },
  { path: '/privacy', labelKey: 'layout.footer.privacy' },
  { path: '/accessibility', labelKey: 'layout.footer.accessibility' },
];
