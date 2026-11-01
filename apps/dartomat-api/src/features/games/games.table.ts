import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { DartRecord } from './engine/game301.js';

export const gameStatus = pgEnum('game_status', ['active', 'finished']);

/** A game of 301. `currentPlayerIdx` and `winnerIdx` point into the players by `playerOrder`. */
export const games = pgTable('games', {
  id: uuid().primaryKey().defaultRandom(),
  startScore: integer('start_score').notNull().default(301),
  doubleOut: boolean('double_out').notNull().default(true),
  status: gameStatus().notNull().default('active'),
  currentPlayerIdx: integer('current_player_idx').notNull().default(0),
  winnerIdx: integer('winner_idx'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const gamePlayers = pgTable(
  'game_players',
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    name: varchar({ length: 24 }).notNull(),
    playerOrder: integer('player_order').notNull(),
    score: integer().notNull(),
  },
  (table) => [unique('game_players_game_order_unique').on(table.gameId, table.playerOrder)],
);

/**
 * Every dart of a game in the order thrown, with the state before it so it can be taken back.
 * The current turn is rebuilt from the last row, see `turnDartsAfter()`.
 */
export const gameDarts = pgTable(
  'game_darts',
  {
    id: uuid().primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sequence: integer().notNull(),
    playerIdx: integer('player_idx').notNull(),
    multiplier: integer().notNull(),
    value: integer().notNull(),
    points: integer().notNull(),
    scoreBefore: integer('score_before').notNull(),
    turnDartsBefore: jsonb('turn_darts_before').notNull().$type<DartRecord[]>(),
    turnEnded: boolean('turn_ended').notNull(),
    bust: boolean().notNull(),
    won: boolean().notNull(),
  },
  (table) => [
    unique('game_darts_game_sequence_unique').on(table.gameId, table.sequence),
    index('game_darts_game_id_idx').on(table.gameId),
  ],
);
