import { users } from '@server/auth/users.table';
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const notes = pgTable(
  'notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    // sanitized HTML, see notes.sanitize.ts
    description: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notes_user_id_idx').on(table.userId)],
);

export const noteImages = pgTable(
  'note_images',
  {
    id: uuid().primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    // file name inside the uploads directory
    filename: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('note_images_note_id_idx').on(table.noteId)],
);
