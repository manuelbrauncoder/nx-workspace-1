import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Messages from the contact form of the start page. */
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(),
    message: text().notNull(),
    read: boolean().notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('contact_messages_created_at_idx').on(table.createdAt)],
);
