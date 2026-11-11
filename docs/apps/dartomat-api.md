# dartomat-api

The backend of Dartomat, a scoreboard for 301: games, players and every dart thrown, plus the rules of the game. Built like `express-api-base` on the same libs, so this page only covers what differs.

| Item     | Value                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------- |
| Folder   | [apps/dartomat-api](../../apps/dartomat-api)                                                      |
| Tags     | `type:api-app`, `scope:dartomat`                                                                  |
| Locally  | <http://localhost:3200>, routes under `/api/v1`, API reference at <http://localhost:3200/docs>    |
| Database | `dartomat_api`, tests `dartomat_api_test`                                                         |
| Libs     | `server-core`, `dartomat-contracts`                                                               |
| Image    | `ghcr.io/<owner>/nx1-dartomat-api`, tag `nx1-dartomat-api-v*`, see [Deployment](../deployment.md) |

## Running it

Once:

```bash
cp apps/dartomat-api/.env.example apps/dartomat-api/.env
```

Set `SESSION_SECRET` in that file, then create the tables:

```bash
pnpm nx run dartomat-api:db:migrate
```

Then, every time:

```bash
pnpm nx serve dartomat-api
```

The targets are those of [express-api-base](express-api-base.md#running-it).

## Endpoints

All under `/api/v1`, only `/health` and `/docs` are at the root. There is no sign-in: whoever has the id of a game can play it.

| Method and path          | Content                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `POST /games`            | Starts a game, the players throw in the order given. Rate limited per IP |
| `GET /games/{id}`        | The game with the checkout recommendation for the current player         |
| `PATCH /games/{id}`      | `doubleOut` switches the finish, `restart` resets every score to 301     |
| `POST /games/{id}/darts` | Throws a dart for the current player; 409 once the game is finished      |
| `POST /games/{id}/undo`  | Takes back the last dart, also the winning one, which reopens the game   |

Every answer is `{ game }`. The full throw history stays on the server; the client gets the current turn and `canUndo`.

## The game

- **Engine**: [engine/game301.ts](../../apps/dartomat-api/src/features/games/engine/game301.ts) applies a dart (bust, win, next player after three darts) and takes it back. It is pure code without a database, tested on its own
- **Storage**: one row per dart in `game_darts` with the state before it (`score_before`, `turn_darts_before`), so undo needs no replay. The current turn is rebuilt from the last row. Every write runs in a transaction that locks the game row
- **Checkout**: [engine/checkout.ts](../../apps/dartomat-api/src/features/games/engine/checkout.ts) has the usual three-dart double-out routes for 2–170 and a solver for the rest, preferring the route with the fewest darts. The API sends the route as darts, the frontend writes it as `T19 · D12`
- **Finished**: the winning dart sets `status: 'finished'`. A restart works on a finished game, undo reopens it

## Differences to express-api-base

- **No auth**: no session middleware, no auth routers, no admin seed. The shared config still requires `SESSION_SECRET` and the keys `session` and `admin`, so they are set with values that are never used. The production check of the admin password does not run here, since no admin is created
- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Config**: own keys `rateLimit.createGameWindowMinutes` and `createGameMaxRequests`, added with `extendConfig()`
- **Schemas**: in `dartomat-contracts`, shared with `dartomat-web`
