# dartomat-contracts

The wire format between `dartomat-api` and `dartomat-web`: the schemas of a darts game. Like `contracts`, it imports nothing but `zod`.

| Item    | Value                                                                |
| ------- | -------------------------------------------------------------------- |
| Folder  | [packages/dartomat/contracts](../../packages/dartomat/contracts/src) |
| Alias   | `@dartomat/contracts/*`, e.g. `@dartomat/contracts/games`            |
| Tags    | `type:contract`, `scope:dartomat`                                    |
| Used by | `dartomat-api`, `dartomat-web`                                       |

## Contents

| File              | What it holds                                                                          |
| ----------------- | -------------------------------------------------------------------------------------- |
| `games.ts`        | Create, patch and throw schemas, the game with players, turn and checkout; `GameDto` … |
| `games-limits.ts` | `PLAYER_NAME_MAX_LENGTH`, `PLAYERS_MAX`, free of Zod for the frontend bundle           |

The frontend imports only types from `games.ts` and the constants from `games-limits.ts`, so Zod stays out of its bundle. Only projects with `scope:dartomat` may import this lib.
