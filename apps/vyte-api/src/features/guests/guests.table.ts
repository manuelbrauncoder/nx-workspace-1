import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { events } from '../events/events.table.js';

export const guestResponse = pgEnum('guest_response', ['pending', 'accepted', 'declined']);
export const answeredBy = pgEnum('answered_by', ['guest', 'host']);

export const guests = pgTable(
  'guests',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    // only for the hosts
    note: text(),
    maxCompanions: integer('max_companions').notNull().default(0),
    // the personal link: 32 random bytes, base64url; renewing replaces it
    token: text().notNull().unique(),
    // the photo link of the place card: only uploads, never the answer; renewing replaces it
    photoToken: text('photo_token').notNull().unique(),
    response: guestResponse().notNull().default('pending'),
    companions: integer().notNull().default(0),
    // set when lowering the allowance cut the companions, cleared by the next answer
    companionsReduced: boolean('companions_reduced').notNull().default(false),
    message: text(),
    answeredBy: answeredBy('answered_by'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('guests_event_id_idx').on(table.eventId)],
);
