import { sectionKeys } from '@portfolio/contracts/portfolio';
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * One row per section of the start page. The content is stored as sent (validated by the
 * section's schema in portfolio.schemas.ts); images are references `{ id, alt }` to `media`.
 */
export const portfolioSections = pgTable('portfolio_sections', {
  key: text({ enum: sectionKeys }).primaryKey(),
  content: jsonb().$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
