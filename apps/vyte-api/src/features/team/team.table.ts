import { users } from '@server/auth/users.table';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { events } from '../events/events.table.js';

/**
 * Invite links for editors: the owner shares one, whoever opens it becomes an editor. A link
 * works once and until `expiresAt`.
 */
export const editorInvites = pgTable(
  'editor_invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // 32 random bytes, base64url
    token: text().notNull().unique(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('editor_invites_event_id_idx').on(table.eventId)],
);
