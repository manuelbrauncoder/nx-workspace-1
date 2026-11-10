# server-auth

Accounts for every API app: users and sessions, sign-up and sign-in, guards, the admin endpoints and the first admin. Knows no features.

| Item    | Value                                                  |
| ------- | ------------------------------------------------------ |
| Folder  | [packages/server/auth](../../packages/server/auth/src) |
| Alias   | `@server/auth/*`, e.g. `@server/auth/auth.middleware`  |
| Tags    | `type:server`, `scope:shared`                          |
| Uses    | `server-core`, `contracts`                             |
| Used by | `express-api-base`, `portfolio-api`, `vyte-api`        |

## Contents

| File                                  | What it holds                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users.table.ts`, `sessions.table.ts` | The tables `users` and `session`                                                                                                                        |
| `auth.*.ts`                           | Sign-up (switchable with `auth.signUpEnabled`), sign-in, sign-out, `/auth/me`, the session middleware, `requireAuth`, `requireAdmin`, `currentUserId()` |
| `admin.*.ts`                          | Users for admins, `seedAdmin()` for the first admin                                                                                                     |
| `user-deletion.ts`                    | `onUserDeleted()`: cleanup hooks of features when an admin deletes a user                                                                               |
| `rate-limit.ts`                       | The rate limit of sign-up and sign-in                                                                                                                   |
| `testing/`                            | `signedUpAgent()`, `adminAgent()`, `resetAuthTables()` for the tests of the apps                                                                        |

## In an app

```ts
createServer({
  middleware: [sessionMiddleware],
  routes: { '/auth': authRouter, '/admin': adminRouter, '/notes': notesRouter },
});
```

The app runs `seedAdmin()` at startup and lists `../../packages/server/auth/src/*.table.ts` in its `drizzle.config.ts`, so its migrations include the auth tables. `drizzle/` of the lib holds migrations of the auth tables alone, for the tests of the lib. After changing a table run `pnpm nx run server-auth:db:generate` and `db:generate` of every API app.

Guides: [Authentication](../backend/authentication.md), [Database](../backend/database.md), [Testing](../backend/testing.md).
