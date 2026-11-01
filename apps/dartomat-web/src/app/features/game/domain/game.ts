// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export type { Checkout, Dart, DartThrow, Game, Multiplier, Player } from '@api/games/game';
