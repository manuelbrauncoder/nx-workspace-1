import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.table';

/**
 * Account links for closed sign-up: an admin names the account, the person sets email and
 * password through the link. A link works once and until `expiresAt`.
 */
export const accountInvites = pgTable('account_invites', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  token: text().notNull().unique(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
