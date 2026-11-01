// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { PLAYERS_MAX, PLAYER_NAME_MAX_LENGTH } from '@api/games/game';
export type { Game, NewGame } from '@api/games/game';
