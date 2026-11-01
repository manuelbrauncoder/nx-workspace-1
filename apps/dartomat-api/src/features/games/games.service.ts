import type {
  CreateGameInput,
  GameDto,
  PatchGameInput,
  ThrowDartInput,
} from '@dartomat/contracts/games';
import { db } from '@server/core/db/db';
import { badRequest, conflict, notFound } from '@server/core/errors';
import { asc, desc, eq } from 'drizzle-orm';
import { recommendCheckout } from './engine/checkout.js';
import {
  applyDart,
  TURN_DARTS,
  turnDartsAfter,
  undoLast,
  type DartRecord,
  type EngineGame,
  type HistoryEntry,
} from './engine/game301.js';
import { gameDarts, gamePlayers, games } from './games.table.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type GameRow = typeof games.$inferSelect;
type PlayerRow = typeof gamePlayers.$inferSelect;
type DartRow = typeof gameDarts.$inferSelect;

interface LoadedGame {
  game: GameRow;
  players: PlayerRow[];
  darts: DartRow[];
}

const START_SCORE = 301;

function toDartRecord(row: Pick<DartRow, 'multiplier' | 'value' | 'points'>): DartRecord {
  return {
    multiplier: row.multiplier as DartRecord['multiplier'],
    value: row.value,
    points: row.points,
  };
}

function toHistoryEntry(row: DartRow): HistoryEntry {
  return {
    playerIdx: row.playerIdx,
    dart: toDartRecord(row),
    scoreBefore: row.scoreBefore,
    turnDartsBefore: row.turnDartsBefore,
    turnEnded: row.turnEnded,
    bust: row.bust,
    won: row.won,
  };
}

function toEngineGame({ game, players, darts }: LoadedGame): EngineGame {
  const history = darts.map(toHistoryEntry);
  const last = history.at(-1);
  return {
    doubleOut: game.doubleOut,
    players: players.map((p) => ({ score: p.score })),
    currentPlayerIdx: game.currentPlayerIdx,
    currentTurnDarts: last ? turnDartsAfter(last) : [],
    history,
    winnerIdx: game.winnerIdx,
  };
}

function toGameDto({ game, players, darts }: LoadedGame): GameDto {
  const last = darts.at(-1);
  const currentTurnDarts = last ? turnDartsAfter(toHistoryEntry(last)) : [];
  const current = players[game.currentPlayerIdx];
  const checkout =
    game.status === 'active' && current
      ? recommendCheckout({
          score: current.score,
          dartsLeft: TURN_DARTS - currentTurnDarts.length,
          doubleOut: game.doubleOut,
        })
      : { status: 'hidden' as const, route: null };

  return {
    id: game.id,
    startScore: game.startScore,
    doubleOut: game.doubleOut,
    status: game.status,
    players: players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    currentPlayerIdx: game.currentPlayerIdx,
    currentTurnDarts,
    winnerIdx: game.winnerIdx,
    checkout,
    canUndo: darts.length > 0,
    createdAt: game.createdAt.toISOString(),
    finishedAt: game.finishedAt?.toISOString() ?? null,
  };
}

/** Loads a game with its players and darts. `lock` keeps parallel writes to the game in order. */
async function load(tx: Transaction, id: string, lock = false): Promise<LoadedGame> {
  const query = tx.select().from(games).where(eq(games.id, id));
  const [game] = lock ? await query.for('update') : await query;
  if (!game) throw notFound('Game not found');

  const players = await tx
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, id))
    .orderBy(asc(gamePlayers.playerOrder));
  const darts = await tx
    .select()
    .from(gameDarts)
    .where(eq(gameDarts.gameId, id))
    .orderBy(asc(gameDarts.sequence));
  return { game, players, darts };
}

/** Writes the scores, the turn and the winner of the engine state back. */
async function saveState(tx: Transaction, { game, players }: LoadedGame, state: EngineGame) {
  for (const [idx, player] of players.entries()) {
    const score = state.players[idx]?.score ?? player.score;
    if (score !== player.score) {
      await tx.update(gamePlayers).set({ score }).where(eq(gamePlayers.id, player.id));
    }
  }
  const finished = state.winnerIdx !== null;
  await tx
    .update(games)
    .set({
      currentPlayerIdx: state.currentPlayerIdx,
      winnerIdx: state.winnerIdx,
      status: finished ? 'finished' : 'active',
      finishedAt: finished ? (game.finishedAt ?? new Date()) : null,
    })
    .where(eq(games.id, game.id));
}

/** Creates a game; the players play in the order given. */
export function createGame(input: CreateGameInput): Promise<GameDto> {
  return db.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({ startScore: START_SCORE, doubleOut: input.doubleOut })
      .returning({ id: games.id });
    await tx.insert(gamePlayers).values(
      input.names.map((name, playerOrder) => ({
        gameId: game!.id,
        name,
        playerOrder,
        score: START_SCORE,
      })),
    );
    return toGameDto(await load(tx, game!.id));
  });
}

export function getGame(id: string): Promise<GameDto> {
  return db.transaction(async (tx) => toGameDto(await load(tx, id)));
}

/**
 * Switches double-out or restarts the game: every score back to the start score, all darts
 * removed, the first player up. A restart also works on a finished game.
 */
export function patchGame(id: string, input: PatchGameInput): Promise<GameDto> {
  return db.transaction(async (tx) => {
    const loaded = await load(tx, id, true);

    if (input.restart) {
      await tx.delete(gameDarts).where(eq(gameDarts.gameId, id));
      await tx
        .update(gamePlayers)
        .set({ score: loaded.game.startScore })
        .where(eq(gamePlayers.gameId, id));
      await tx
        .update(games)
        .set({ currentPlayerIdx: 0, winnerIdx: null, status: 'active', finishedAt: null })
        .where(eq(games.id, id));
    }
    if (input.doubleOut !== undefined) {
      await tx.update(games).set({ doubleOut: input.doubleOut }).where(eq(games.id, id));
    }

    return toGameDto(await load(tx, id));
  });
}

export function throwDart(id: string, dart: ThrowDartInput): Promise<GameDto> {
  return db.transaction(async (tx) => {
    const loaded = await load(tx, id, true);
    if (loaded.game.status === 'finished') throw conflict('Game is finished');

    const state = toEngineGame(loaded);
    const result = applyDart(state, dart);
    if (!result.applied) throw badRequest('Invalid dart');

    const { entry } = result;
    await tx.insert(gameDarts).values({
      gameId: id,
      sequence: (loaded.darts.at(-1)?.sequence ?? 0) + 1,
      playerIdx: entry.playerIdx,
      multiplier: entry.dart.multiplier,
      value: entry.dart.value,
      points: entry.dart.points,
      scoreBefore: entry.scoreBefore,
      turnDartsBefore: entry.turnDartsBefore,
      turnEnded: entry.turnEnded,
      bust: entry.bust,
      won: entry.won,
    });
    await saveState(tx, loaded, state);

    return toGameDto(await load(tx, id));
  });
}

/** Takes back the last dart, also the winning one, which reopens the game. */
export function undoDart(id: string): Promise<GameDto> {
  return db.transaction(async (tx) => {
    const loaded = await load(tx, id, true);
    const state = toEngineGame(loaded);
    if (!undoLast(state)) throw conflict('Nothing to undo');

    const [last] = await tx
      .select({ id: gameDarts.id })
      .from(gameDarts)
      .where(eq(gameDarts.gameId, id))
      .orderBy(desc(gameDarts.sequence))
      .limit(1);
    await tx.delete(gameDarts).where(eq(gameDarts.id, last!.id));
    await saveState(tx, loaded, state);

    return toGameDto(await load(tx, id));
  });
}
