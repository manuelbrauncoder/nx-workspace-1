// Free of Zod, so the frontend can import the page names and the limit without pulling Zod into
// its bundle.

/** The legal pages. Each one is a singleton with an HTML fragment per language. */
export const legalPageKeys = ['imprint', 'privacy', 'accessibility', 'cookies'] as const;
export type LegalPageKey = (typeof legalPageKeys)[number];

/** Longest HTML of one language of a page. */
export const LEGAL_PAGE_MAX_LENGTH = 100_000;
