// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { LEGAL_PAGES, LEGAL_PAGE_MAX_LENGTH, isLegalPageName } from '@api/legal/legal-page';
export type { LegalPage, LegalPageName, LegalPages } from '@api/legal/legal-page';
