# Architecture

`express-api-base` is the first API app of the Nx workspace. More API apps will follow, so everything they share lives in libs. The app itself keeps only its features, organized by feature: everything that belongs to notes lives in the notes folder.

## Folder structure

```
packages/contracts/src/             @contracts/*: zod schemas of the wire format, limits, rich text rules
                                    (shared with the Angular apps)
packages/server/core/src/           @server/core/*: what every API app is built on
  config.ts                         loads and validates env vars + the JSON config, extendConfig()
  server.ts                         createServer(): middleware, /health, /docs, 404, error handler;
                                    startServer(): listen and shutdown
  db/db.ts                          Postgres pool and the Drizzle instance
  db/migrate.ts                     runs migrations (used by the script and the tests)
  errors.ts                         HttpError and helpers like notFound()
  logger.ts                         pino logger
  validate.ts                       parse(): zod validation for request input
  openapi.ts                        helpers for the feature openapi files, buildOpenApiDocument()
  middleware/                       error handler, origin check
  testing/global-setup.ts           creates and migrates the test database
packages/server/auth/src/           @server/auth/*: accounts for every API app
  users.table.ts, sessions.table.ts
  auth.*.ts                         sign-up, sign-in, sign-out, sessions, guards
  admin.*.ts                        user management for admins, the first admin
  user-deletion.ts                  onUserDeleted(): cleanup hooks of features
  rate-limit.ts                     rate limit for the auth endpoints
  testing/                          test helpers for apps and the tests of the lib
apps/express-api-base/
  config/                           JSON config files (settings, plus the first admin's credentials)
  drizzle/                          generated SQL migrations, including the auth tables
  src/
    index.ts                        creates the first admin, starts the server
    app.ts                          createServer() with the routers of auth, admin and notes
    config/index.ts                 the shared config plus the `uploads` keys of this app
    scripts/migrate.ts              entry point for `db:migrate` and the migrate container
    features/
      notes/                        notes CRUD, sanitizing, images
      docs/                         the OpenAPI document of this app
    test/                           test setup and helpers
```

## Files inside a feature

Using notes as the example:

| File                                   | Responsibility                                                      |
| -------------------------------------- | ------------------------------------------------------------------- |
| `notes.table.ts`                       | Drizzle table definitions                                           |
| `notes.routes.ts`                      | Express router: validate input, call the service, send the response |
| `notes.service.ts`                     | Business logic and database queries                                 |
| `notes.openapi.ts`                     | Documentation entries for the endpoints                             |
| `notes.test.ts`                        | Tests                                                               |
| `notes.sanitize.ts`, `notes.images.ts` | Feature-specific helpers                                            |

The zod schemas of requests and responses are not in the feature but in `@contracts/notes`, so the Angular app uses the same definitions.

There are two layers on purpose: **routes** know about HTTP, **services** know about data. There is no separate controller or repository layer; for a project of this size they would only add files to jump between.

## Rules

- **One-way imports:** app → `@server/auth` → `@server/core` → `@contracts`. Nx tags enforce it (`type:api-app`, `type:server`, `type:contract`), so a lib never imports an app, and no API project imports Angular code or the other way round.
- **Features stay independent:** notes only imports `requireAuth`, `currentUserId` and the `users` table from auth. Admin knows no feature: when it deletes a user, it runs the hooks registered with `onUserDeleted()`. Notes registers one in `app.ts` that removes the image files. The docs feature and `app.ts` import from all features because they assemble them.
- **Only `packages/server/core/src/config.ts` reads `process.env`** (plus the migrate script, which must run without the config file).
- **The app is bundled.** rolldown bundles the app and the libs into `dist/apps/express-api-base`, the npm packages stay external. Imports therefore need no `.js` ending. Older files still have it, both work.

## Request flow

`createServer()` in [`packages/server/core/src/server.ts`](../../packages/server/core/src/server.ts) registers the middleware in this order, [`apps/express-api-base/src/app.ts`](../../apps/express-api-base/src/app.ts) passes the session middleware and the routers:

1. **Request logging** (`pino-http`).
2. **Security headers** (`helmet`). `Cross-Origin-Resource-Policy` is set to `same-site` so a frontend on a sibling subdomain can embed images from the API.
3. **CORS**, allowing only the origins from the config, with credentials.
4. **Origin check**, the CSRF protection. See [Authentication](authentication.md#csrf-protection).
5. **JSON body parser**, limited to 1 MB.
6. `/health` (answers `{ status: 'ok', version }` with the version passed to `createServer({ version })` from the app's `package.json`, see [Releasing](../releasing.md#seeing-the-running-version)) and, if enabled, `/docs`. They are mounted before the session middleware, so they never touch the session store.
7. **Session middleware**, then the `/auth`, `/notes` and `/admin` routers. With `createServer({ prefix: '/api/v1' })` they are mounted below the prefix, `/health` and `/docs` stay at the root (portfolio-api does this). Pass the same `prefix` to `buildOpenApiDocument()`, the features register their paths without it.
8. **404 handler** for unknown routes.
9. **Error handler**.

## Validation

Route handlers validate input with `parse()` from [`packages/server/core/src/validate.ts`](../../packages/server/core/src/validate.ts):

```ts
notesRouter.patch('/:id', async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  const note = await updateNote(currentUserId(req), id, parse(updateNoteSchema, req.body));
  res.json({ note });
});
```

`parse()` returns the typed, validated data or throws a 400 with a list of failing fields.

## Error handling

Services and handlers throw an `HttpError` from [`packages/server/core/src/errors.ts`](../../packages/server/core/src/errors.ts), usually through a helper:

```ts
if (!note) throw notFound('Note not found');
```

Express 5 forwards errors from async handlers automatically, so no `try/catch` is needed in routes. The [error handler](../../packages/server/core/src/middleware/error-handler.ts) turns every error into the same JSON shape:

```json
{ "error": { "message": "Validation failed", "details": [{ "path": "title", "message": "…" }] } }
```

`details` is only present for validation errors. Anything that is not an expected error is logged and answered with a generic 500, so internals never leak to the client.

## Adding a new feature

For a feature called `tasks`:

1. Create `apps/express-api-base/src/features/tasks/`.
2. **`tasks.table.ts`:** define the Drizzle tables. Any file matching `apps/express-api-base/src/features/**/*.table.ts` is picked up automatically.
3. Run `pnpm nx run express-api-base:db:generate` to create the migration, then `pnpm nx run express-api-base:db:migrate`.
4. **Schemas** for request bodies, params and the response shape in `packages/contracts/src/tasks.ts`, if a frontend uses the endpoints. Otherwise next to the feature.
5. **`tasks.service.ts`:** the logic and queries. Scope every query to the user id if the data is private.
6. **`tasks.routes.ts`:** the router. Add `tasksRouter.use(requireAuth)` if all routes need a session.
7. Mount it in [`apps/express-api-base/src/app.ts`](../../apps/express-api-base/src/app.ts): add `'/tasks': tasksRouter` to `routes`. If the feature stores files or other things the database cascade does not remove, register a cleanup with `onUserDeleted()` there too.
8. **`tasks.openapi.ts`:** export `registerTasksDocs(registry)` and add it to `register` in [`apps/express-api-base/src/features/docs/docs.document.ts`](../../apps/express-api-base/src/features/docs/docs.document.ts).
9. **`tasks.test.ts`:** tests, using the helpers from `apps/express-api-base/src/test/helpers.ts`.
10. Add the new router to the route coverage test in [`apps/express-api-base/src/features/docs/docs.test.ts`](../../apps/express-api-base/src/features/docs/docs.test.ts), so undocumented endpoints fail the test suite.

## Adding an API app

See [Workspace](../workspace.md#adding-an-api-app).
