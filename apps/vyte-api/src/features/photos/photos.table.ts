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
import { guests } from '../guests/guests.table.js';

export const photoSource = pgEnum('photo_source', ['guest', 'stand']);

/** Photos guests take at the event, through their photo link or the photo stand. */
export const eventPhotos = pgTable(
  'event_photos',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    source: photoSource().notNull(),
    // the guest of the photo link; the photo stays when the guest is removed
    guestId: uuid('guest_id').references(() => guests.id, { onDelete: 'set null' }),
    // the device cookie of the stand
    deviceId: text('device_id'),
    // the guest's name at upload time, or what a stand visitor typed
    uploaderName: text('uploader_name'),
    // file name inside the uploads directory
    filename: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    hidden: boolean().notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('event_photos_event_id_idx').on(table.eventId),
    index('event_photos_guest_id_idx').on(table.guestId),
  ],
);
