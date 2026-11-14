import { z } from 'zod';
import { LEGAL_PAGE_MAX_LENGTH, type LegalPageKey, legalPageKeys } from './legal-limits';

export { LEGAL_PAGE_MAX_LENGTH, legalPageKeys, type LegalPageKey } from './legal-limits';

const html = z.string().trim().min(1).max(LEGAL_PAGE_MAX_LENGTH);

/** A complete page in both languages, as the seed files provide it. */
export const legalPageInputSchema = z.object({ de: html, en: html });

/** The body of `PATCH /legal/<page>`: one or both languages. */
export const legalPageUpdateSchema = legalPageInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

/** A page as returned to the editor: the sanitized HTML of both languages. */
export const legalPageSchema = z.object({
  de: z.string(),
  en: z.string(),
  updatedAt: z.iso.datetime(),
});

/** All pages; a page is null until it has been created. */
export const legalPagesSchema = z.object(
  Object.fromEntries(legalPageKeys.map((key) => [key, legalPageSchema.nullable()])),
);

/** The language of the page; German is the default. */
export const legalQuerySchema = z.object({ lang: z.enum(['de', 'en']).default('de') });

export type LegalLanguage = z.output<typeof legalQuerySchema>['lang'];
export type LegalPageUpdate = z.output<typeof legalPageUpdateSchema>;

// The wire format as a client sees it. `updatedAt` is an ISO 8601 string.
export type LegalPageDto = z.output<typeof legalPageSchema>;
/** `GET /legal`: every page, `null` until it was created. */
export type LegalPagesDto = Record<LegalPageKey, LegalPageDto | null>;
/** `PATCH /legal/<page>` wraps the page in its name, e.g. `{ imprint }`. */
export type LegalPageResponseDto<K extends LegalPageKey> = Record<K, LegalPageDto>;
/** Body of `PATCH /legal/<page>`. */
export type LegalPageUpdateDto = z.input<typeof legalPageUpdateSchema>;
