import { index, json, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

// Table layout required by connect-pg-simple. The session store reads and writes it;
// revokeSessions() in auth.session.ts deletes rows by user.
export const sessions = pgTable(
  'session',
  {
    sid: varchar().primaryKey(),
    sess: json().notNull(),
    expire: timestamp({ precision: 6 }).notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);
