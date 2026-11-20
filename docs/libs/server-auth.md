# server-auth

Accounts for every API app: users and sessions, sign-up and sign-in, guards, the admin endpoints, the first admin and account links for closed sign-up. Knows no features.

| Item    | Value                                                  |
| ------- | ------------------------------------------------------ |
| Folder  | [packages/server/auth](../../packages/server/auth/src) |
| Alias   | `@server/auth/*`, e.g. `@server/auth/auth.middleware`  |
| Tags    | `type:server`, `scope:shared`                          |
| Uses    | `server-core`, `contracts`                             |
| Used by | `express-api-base`, `portfolio-api`, `vyte-api`        |

## Contents

| File                                  | What it holds                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users.table.ts`, `sessions.table.ts` | The tables `users` and `session`                                                                                                                                                                                                                                               |
| `account-invites.table.ts`            | The table `account_invites`: account links                                                                                                                                                                                                                                     |
| `auth.*.ts`                           | Sign-up (switchable with `auth.signUpEnabled`), sign-in, sign-out, `/auth/me`, the session middleware, `requireAuth`, `requireAdmin`, `isAdmin(req)` (for public routes, answers `false` for guests), `currentUserId()`, `hashPassword()`, `insertUser()`                      |
| `account-invites.*.ts`                | Account links: the service, the two opt-in routers `accountInvitesAdminRouter` and `accountInvitesRouter`, their OpenAPI entries `registerAccountInviteDocs()`                                                                                                                 |
| `admin.*.ts`                          | Users for admins, `seedAdmin()` for the first admin, `admin.password.ts` checks its password in production                                                                                                                                                                     |
| `user-deletion.ts`                    | `onUserDeleted()`: hooks of features when an admin deletes a user. A hook gets `(userId, tx)` and runs in the transaction that deletes the user; what it returns runs after the commit. A throwing hook rolls the deletion back. The sessions are revoked before the hooks run |
| `rate-limit.ts`                       | The rate limit of sign-up, sign-in and creating an account from a link                                                                                                                                                                                                         |
| `testing/`                            | `signedUpAgent()`, `adminAgent()`, `resetAuthTables()` for the tests of the apps                                                                                                                                                                                               |

The wire format of account links is in [`contracts`](contracts.md) (`account-invites.ts`).

## In an app

```ts
createServer({
  middleware: [sessionMiddleware],
  routes: {
    '/auth/account-invites': accountInvitesRouter,
    '/admin/account-invites': accountInvitesAdminRouter,
    '/auth': authRouter,
    '/admin': adminRouter,
    '/notes': notesRouter,
  },
});
```

The account link routers are opt-in. An app that closes sign-up and wants accounts from admins mounts both before `/auth` and `/admin`, and registers their docs with `registerAccountInviteDocs(registry)` in its OpenAPI document. An app that does not mount them still gets the table through its migrations, but no routes.

The app runs `seedAdmin()` at startup and lists `../../packages/server/auth/src/*.table.ts` in its `drizzle.config.ts`, so its migrations include the auth tables, `account_invites` among them. `drizzle/` of the lib holds migrations of the auth tables alone, for the tests of the lib. After changing a table run `pnpm nx run server-auth:db:generate` and `db:generate` of every API app.

### Creating users outside sign-up

`signUp()` is `hashPassword()` followed by `insertUser()`. A feature that creates a user inside its own transaction hashes the password first, outside the transaction, and then calls `insertUser(input, tx)` with the hash. The account link does this so the lock on the link is not held while argon2 runs.

Guides: [Authentication](../backend/authentication.md), [Database](../backend/database.md), [Testing](../backend/testing.md).
