/** Darts per turn. */
export const TURN_DARTS = 3;

/** A dart as thrown: the segment `value` (1–20, 25 for the bull, 0 for a miss) and its ring. */
export interface Dart {
  multiplier: 1 | 2 | 3;
  value: number;
}

/** A dart as recorded, with its points. */
export interface DartRecord extends Dart {
  points: number;
}

/** One thrown dart and the state before it, enough to take it back. */
export interface HistoryEntry {
  playerIdx: number;
  dart: DartRecord;
  scoreBefore: number;
  turnDartsBefore: DartRecord[];
  turnEnded: boolean;
  bust: boolean;
  won: boolean;
}

export interface EnginePlayer {
  score: number;
}

/** The state the rules work on. `applyDart()` and `undoLast()` change it in place. */
export interface EngineGame {
  doubleOut: boolean;
  players: EnginePlayer[];
  currentPlayerIdx: number;
  currentTurnDarts: DartRecord[];
  history: HistoryEntry[];
  winnerIdx: number | null;
}

export type ApplyDartResult =
  { applied: true; entry: HistoryEntry } | { applied: false; reason: 'won' | 'invalid' };

/** A miss is a single, the bull has no triple, every other value is 1–20. */
export function isValidDart(dart: Dart): boolean {
  const { multiplier, value } = dart;
  if (![1, 2, 3].includes(multiplier)) return false;
  if (value === 0) return multiplier === 1;
  if (value === 25) return multiplier === 1 || multiplier === 2;
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

export function dartPoints(dart: Dart): number {
  return dart.multiplier * dart.value;
}

function outcome(doubleOut: boolean, scoreBefore: number, dart: Dart) {
  const newScore = scoreBefore - dartPoints(dart);
  if (newScore < 0) return { bust: true, won: false, newScore };
  if (doubleOut) {
    if (newScore === 1) return { bust: true, won: false, newScore };
    if (newScore === 0) {
      return dart.multiplier === 2
        ? { bust: false, won: true, newScore }
        : { bust: true, won: false, newScore };
    }
    return { bust: false, won: false, newScore };
  }
  return { bust: false, won: newScore === 0, newScore };
}

/**
 * Applies a dart to the current player and records it in the history.
 *
 * - Bust (below zero; with double-out a rest of 1 or a finish not on a double): the score goes
 *   back to the start of the turn and the next player is up.
 * - Win: `winnerIdx` is set, the winning turn stays in `currentTurnDarts`.
 * - Third dart: the next player is up.
 */
export function applyDart(game: EngineGame, dart: Dart): ApplyDartResult {
  if (game.winnerIdx !== null) return { applied: false, reason: 'won' };
  if (!isValidDart(dart)) return { applied: false, reason: 'invalid' };

  const playerIdx = game.currentPlayerIdx;
  const player = game.players[playerIdx];
  if (!player) return { applied: false, reason: 'invalid' };

  const scoreBefore = player.score;
  const turnDartsBefore = game.currentTurnDarts.slice();
  const record: DartRecord = {
    multiplier: dart.multiplier,
    value: dart.value,
    points: dartPoints(dart),
  };
  const { bust, won, newScore } = outcome(game.doubleOut, scoreBefore, dart);
  const nextPlayerIdx = (playerIdx + 1) % game.players.length;

  let turnEnded = false;
  if (bust) {
    turnEnded = true;
    player.score = scoreBefore + turnDartsBefore.reduce((sum, d) => sum + d.points, 0);
    game.currentTurnDarts = [];
    game.currentPlayerIdx = nextPlayerIdx;
  } else {
    player.score = newScore;
    const nextTurn = [...turnDartsBefore, record];
    if (won) {
      turnEnded = true;
      game.winnerIdx = playerIdx;
      game.currentTurnDarts = nextTurn;
    } else if (nextTurn.length >= TURN_DARTS) {
      turnEnded = true;
      game.currentTurnDarts = [];
      game.currentPlayerIdx = nextPlayerIdx;
    } else {
      game.currentTurnDarts = nextTurn;
    }
  }

  const entry: HistoryEntry = {
    playerIdx,
    dart: record,
    scoreBefore,
    turnDartsBefore,
    turnEnded,
    bust,
    won,
  };
  game.history.push(entry);
  return { applied: true, entry };
}

/** Takes back the last dart, also the winning one. Returns the removed entry. */
export function undoLast(game: EngineGame): HistoryEntry | null {
  const entry = game.history.pop();
  if (!entry) return null;
  const player = game.players[entry.playerIdx];
  if (player) player.score = entry.scoreBefore;
  game.currentTurnDarts = entry.turnDartsBefore.slice();
  game.currentPlayerIdx = entry.playerIdx;
  if (entry.won) game.winnerIdx = null;
  return entry;
}

/** The darts of the current turn after `entry`, the last recorded dart. */
export function turnDartsAfter(entry: HistoryEntry): DartRecord[] {
  if (!entry.turnEnded || entry.won) return [...entry.turnDartsBefore, entry.dart];
  return [];
}
