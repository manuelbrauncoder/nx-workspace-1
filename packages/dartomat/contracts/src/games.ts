import { z } from 'zod';
import { PLAYER_NAME_MAX_LENGTH, PLAYERS_MAX } from './games-limits';

const playerName = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);

/** The body of `POST /games`. The players play in the order given. */
export const createGameSchema = z.object({
  names: z
    .array(playerName)
    .min(1)
    .max(PLAYERS_MAX)
    .refine((names) => new Set(names.map((n) => n.toLowerCase())).size === names.length, {
      message: 'Names must be unique',
    }),
  doubleOut: z.boolean().default(true),
});

export const gameParamsSchema = z.object({ id: z.uuid() });

/**
 * The body of `PATCH /games/{id}`. `restart` resets every score to the start score and keeps
 * the players and their order, also after the game is finished.
 */
export const patchGameSchema = z
  .object({ doubleOut: z.boolean(), restart: z.literal(true) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const multiplier = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/**
 * The body of `POST /games/{id}/darts`. `value` is the segment: 1–20, 25 for the bull, 0 for a
 * miss. A miss is a single, the bull has no triple; the double bull is `{ multiplier: 2, value: 25 }`.
 */
export const throwDartSchema = z
  .object({ multiplier, value: z.number().int().min(0).max(25) })
  .refine(({ value }) => value <= 20 || value === 25, {
    message: 'Value must be 0–20 or 25',
    path: ['value'],
  })
  .refine(({ multiplier, value }) => value !== 0 || multiplier === 1, {
    message: 'A miss is a single',
    path: ['multiplier'],
  })
  .refine(({ multiplier, value }) => value !== 25 || multiplier !== 3, {
    message: 'The bull has no triple',
    path: ['multiplier'],
  });

/** A thrown dart. `points` is `multiplier * value`. */
export const dartSchema = z.object({
  multiplier,
  value: z.number().int(),
  points: z.number().int(),
});

export const playerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  score: z.number().int(),
});

/**
 * The recommended way out for the current player with the darts left in the turn.
 * `hidden`: no finish is in reach (score above 170 or no darts left). `impossible`: the score
 * cannot be finished with the darts left. `ok`: `route` holds the darts to throw.
 */
export const checkoutSchema = z.object({
  status: z.enum(['hidden', 'ok', 'impossible']),
  route: z.array(dartSchema.omit({ points: true })).nullable(),
});

export const gameStatusSchema = z.enum(['active', 'finished']);

/** A game as returned by the API. The full throw history stays on the server. */
export const gameSchema = z.object({
  id: z.uuid(),
  startScore: z.number().int(),
  doubleOut: z.boolean(),
  status: gameStatusSchema,
  players: z.array(playerSchema),
  currentPlayerIdx: z.number().int(),
  /** Darts of the current turn; after the winning dart they are the winning turn. */
  currentTurnDarts: z.array(dartSchema),
  winnerIdx: z.number().int().nullable(),
  checkout: checkoutSchema,
  canUndo: z.boolean(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});

// The API wraps a game in `game`.
export const gameResponseSchema = z.object({ game: gameSchema });

export type CreateGameInput = z.output<typeof createGameSchema>;
export type PatchGameInput = z.output<typeof patchGameSchema>;
export type ThrowDartInput = z.output<typeof throwDartSchema>;

// The wire format as a client sees it. Dates are ISO 8601 strings.
/** Body of `POST /games`. */
export type CreateGameDto = z.input<typeof createGameSchema>;
/** Body of `PATCH /games/{id}`. */
export type PatchGameDto = z.input<typeof patchGameSchema>;
/** Body of `POST /games/{id}/darts`. */
export type ThrowDartDto = z.input<typeof throwDartSchema>;
export type DartDto = z.output<typeof dartSchema>;
export type PlayerDto = z.output<typeof playerSchema>;
export type CheckoutDto = z.output<typeof checkoutSchema>;
export type GameStatusDto = z.output<typeof gameStatusSchema>;
export type GameDto = z.output<typeof gameSchema>;
export type GameResponseDto = z.output<typeof gameResponseSchema>;
