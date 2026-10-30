import { Localized } from '@core/i18n/localized';

/** The legal pages, in the order of the footer. */
export const LEGAL_PAGES = ['imprint', 'privacy', 'accessibility', 'cookies'] as const;

export type LegalPageName = (typeof LEGAL_PAGES)[number];

export const isLegalPageName = (value: unknown): value is LegalPageName =>
  typeof value === 'string' && (LEGAL_PAGES as readonly string[]).includes(value);

/**
 * A legal page as the editor sees it: the HTML of every language. The heading is not part of it,
 * the app renders it.
 */
export interface LegalPage {
  html: Localized<string>;
  updatedAt: Date;
}

/** Every legal page. A page is `undefined` until an admin created it. */
export type LegalPages = Record<LegalPageName, LegalPage | undefined>;

/** The limit of the backend per language, so the form can report it before sending. */
export const LEGAL_PAGE_MAX_LENGTH = 100_000;
