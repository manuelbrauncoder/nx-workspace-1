# server-auth

Accounts for every API app: the `users` and `session` tables, sign-up, sign-in, sign-out and `/auth/me`, the session cookie, the guards `requireAuth` and `requireAdmin`, the rate limit for auth and the admin endpoints with `seedAdmin()`. When an admin deletes a user, the hooks registered with `onUserDeleted()` let features clean up files and other things the database cascade does not cover.

An app mounts `sessionMiddleware`, `authRouter` and `adminRouter` through `createServer()` and runs `seedAdmin()` at startup. Its `drizzle.config.ts` includes `packages/server/auth/src/*.table.ts`.

`drizzle/` holds migrations of the auth tables alone, for the tests of this lib. After changing a table run `pnpm nx run server-auth:db:generate` and `db:generate` of every API app.

Imported through `@server/auth/*`, e.g. `@server/auth/auth.middleware`.

Details: [docs/libs/server-auth.md](../../../docs/libs/server-auth.md)
