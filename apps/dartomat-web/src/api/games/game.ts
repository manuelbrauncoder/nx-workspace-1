export type Multiplier = 1 | 2 | 3;

/**
 * A dart as thrown: the segment `value` (1–20, 25 for the bull, 0 for a miss) and its ring.
 * The double bull is `{ multiplier: 2, value: 25 }`.
 */
export interface DartThrow {
  multiplier: Multiplier;
  value: number;
}

/** A recorded dart with its points. */
export interface Dart extends DartThrow {
  points: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

/**
 * The way out for the current player. `hidden`: no finish in reach; `impossible`: in reach but
 * not finishable with the darts left; `ok`: `route` holds the darts to throw.
 */
export interface Checkout {
  status: 'hidden' | 'ok' | 'impossible';
  route: DartThrow[];
}

export type GameStatus = 'active' | 'finished';

export interface Game {
  id: string;
  startScore: number;
  doubleOut: boolean;
  status: GameStatus;
  /** In the order they throw. */
  players: Player[];
  currentPlayerIdx: number;
  /** Darts of the current turn; after the winning dart the winning turn. */
  currentTurnDarts: Dart[];
  winnerIdx: number | null;
  checkout: Checkout;
  /** At least one dart was thrown, also in a finished game. */
  canUndo: boolean;
  createdAt: Date;
  finishedAt: Date | null;
}

/** What starts a game: the players in the order they throw. */
export interface NewGame {
  names: string[];
  doubleOut: boolean;
}

// The limits of the API, so a form can report them before sending.
export { PLAYERS_MAX, PLAYER_NAME_MAX_LENGTH } from '@dartomat/contracts/games-limits';
