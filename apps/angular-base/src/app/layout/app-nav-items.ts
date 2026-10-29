import { TranslationKey } from '@core/i18n/translation-key';
import { UiNavMenuItem } from '@shared/ui/nav-menu/nav-menu';

export interface AppNavItem {
  /** Absolute route path. */
  path: string;
  labelKey: TranslationKey;
}

/** Single source for the navigation in the header and in the mobile drawer. */
export const APP_NAV_ITEMS: UiNavMenuItem[] = [
  { path: '/notes', labelKey: 'layout.nav.notes' },
  {
    labelKey: 'layout.nav.showcase',
    children: [
      { path: '/showcase', labelKey: 'layout.nav.showcaseOverview', exact: true },
      { path: '/showcase/typography', labelKey: 'layout.nav.showcaseTypography' },
      { path: '/showcase/colors', labelKey: 'layout.nav.showcaseColors' },
      { path: '/showcase/forms', labelKey: 'layout.nav.showcaseForms' },
      { path: '/showcase/components', labelKey: 'layout.nav.showcaseComponents' },
    ],
  },
];

/** Links to the legal pages in the footer. */
export const APP_FOOTER_ITEMS: AppNavItem[] = [
  { path: '/imprint', labelKey: 'layout.footer.imprint' },
  { path: '/privacy', labelKey: 'layout.footer.privacy' },
  { path: '/accessibility', labelKey: 'layout.footer.accessibility' },
];
