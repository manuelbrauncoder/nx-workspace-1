import { users } from '@server/auth/users.table';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  // sanitized HTML, see events.sanitize.ts
  description: text().notNull(),
  locationName: text('location_name'),
  address: text(),
  allDay: boolean('all_day').notNull().default(false),
  // all-day: midnight of the first and the last day in `time_zone`
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  timeZone: text('time_zone').notNull(),
  rsvpDeadline: timestamp('rsvp_deadline', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const memberRole = pgEnum('member_role', ['owner', 'editor']);

/** Owner and editors of an event; exactly one owner, so every access check reads this table. */
export const eventMembers = pgTable(
  'event_members',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRole().notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index('event_members_user_id_idx').on(table.userId),
    // the database keeps it at one owner, also once the owner can hand the event over
    uniqueIndex('event_members_one_owner_idx')
      .on(table.eventId)
      .where(sql`${table.role} = 'owner'`),
  ],
);

export const eventImages = pgTable(
  'event_images',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // file name inside the uploads directory
    filename: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    // 0 is the cover image
    position: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('event_images_event_id_position_key').on(table.eventId, table.position)],
);
