import { z } from 'zod';
import { languages } from './portfolio';

/** The legal pages. Each one is a singleton with an HTML fragment per language. */
export const legalPageKeys = ['imprint', 'privacy', 'accessibility', 'cookies'] as const;
export type LegalPageKey = (typeof legalPageKeys)[number];

const html = z.string().trim().min(1).max(100_000);

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

export const legalQuerySchema = z.object({ lang: z.enum(languages).default('de') });

export type LegalPageUpdate = z.output<typeof legalPageUpdateSchema>;

// The wire format as a client sees it. `updatedAt` is an ISO 8601 string.
export type LegalPageDto = z.output<typeof legalPageSchema>;
/** `GET /legal`: every page, `null` until it was created. */
export type LegalPagesDto = Record<LegalPageKey, LegalPageDto | null>;
/** `PATCH /legal/<page>` wraps the page in its name, e.g. `{ imprint }`. */
export type LegalPageResponseDto<K extends LegalPageKey> = Record<K, LegalPageDto>;
/** Body of `PATCH /legal/<page>`. */
export type LegalPageUpdateDto = z.input<typeof legalPageUpdateSchema>;
