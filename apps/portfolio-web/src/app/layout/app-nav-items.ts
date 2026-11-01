import { TranslationKey } from '@core/i18n/translation-key';
import { UiNavMenuItem } from '@shared/ui/nav-menu/nav-menu';

export interface AppNavItem {
  /** Absolute route path. */
  path: string;
  labelKey: TranslationKey;
}

/**
 * Single source for the navigation in the header and in the mobile drawer: the sections of the
 * portfolio on the start page. Notes and the showcase stay reachable through their URLs.
 */
export const APP_NAV_ITEMS: UiNavMenuItem[] = [
  { path: '/', fragment: 'about', labelKey: 'layout.nav.about' },
  { path: '/', fragment: 'projects', labelKey: 'layout.nav.projects' },
  { path: '/', fragment: 'skills', labelKey: 'layout.nav.skills' },
  { path: '/', fragment: 'contact', labelKey: 'layout.nav.contact' },
];

/** Links to the legal pages in the footer. */
export const APP_FOOTER_ITEMS: AppNavItem[] = [
  { path: '/imprint', labelKey: 'layout.footer.imprint' },
  { path: '/privacy', labelKey: 'layout.footer.privacy' },
  { path: '/accessibility', labelKey: 'layout.footer.accessibility' },
  { path: '/cookies', labelKey: 'layout.footer.cookies' },
];
