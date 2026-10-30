import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Images for the portfolio content, uploaded by an admin and served publicly. */
export const media = pgTable('media', {
  id: uuid().primaryKey().defaultRandom(),
  // file name inside the uploads directory
  filename: text().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
