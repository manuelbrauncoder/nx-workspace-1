import { legalPageKeys } from '@vyte/contracts/legal';
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** One row per legal page; `html` holds the sanitized fragment of each language. */
export const legalPages = pgTable('legal_pages', {
  key: text({ enum: legalPageKeys }).primaryKey(),
  html: jsonb().$type<{ de: string; en: string }>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
