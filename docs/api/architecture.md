# Architecture

The code is organized by feature: everything that belongs to notes lives in the notes folder, everything for auth in the auth folder. Code that several features need lives in `shared`.

## Folder structure

```
config/                     JSON config files (settings, plus the first admin's credentials)
drizzle/                    generated SQL migrations
src/
  index.ts                  creates the first admin, starts the HTTP server, handles shutdown
  app.ts                    builds the Express app: middleware, routers, error handler
  config/index.ts           loads and validates env vars + the JSON config
  db/
    index.ts                Postgres pool and the Drizzle instance
    migrate.ts              runs migrations (used by the script and the tests)
  scripts/migrate.ts        entry point for `pnpm db:migrate` and the migrate container
  features/
    auth/                   sign-up, sign-in, sign-out, sessions, roles
    admin/                  user management for admins, the first admin
    notes/                  notes CRUD, sanitizing, images
    docs/                   OpenAPI document and the /docs page
  shared/
    errors.ts               HttpError and helpers like notFound()
    logger.ts               pino logger
    validate.ts             parse(): zod validation for request input
    openapi.ts              helpers for the feature openapi files
    middleware/             error handler, origin check, rate limit
  test/                     test setup and helpers
```

## Files inside a feature

Using notes as the example:

| File                                   | Responsibility                                                      |
| -------------------------------------- | ------------------------------------------------------------------- |
| `notes.table.ts`                       | Drizzle table definitions                                           |
| `notes.schemas.ts`                     | zod schemas for requests and responses                              |
| `notes.routes.ts`                      | Express router: validate input, call the service, send the response |
| `notes.service.ts`                     | Business logic and database queries                                 |
| `notes.openapi.ts`                     | Documentation entries for the endpoints                             |
| `notes.test.ts`                        | Tests                                                               |
| `notes.sanitize.ts`, `notes.images.ts` | Feature-specific helpers                                            |

There are two layers on purpose: **routes** know about HTTP, **services** know about data. There is no separate controller or repository layer; for a project of this size they would only add files to jump between.

## Rules

- **One-way imports:** features import from `shared`, `config` and `db`. `shared` never imports from a feature.
- **Features stay independent:** notes only imports `requireAuth` and `currentUserId` from auth. Admin is the exception: managing users means touching their sessions (auth) and their image files (notes). The docs feature and `app.ts` import from all features because they assemble them.
- **Only `src/config/index.ts` reads `process.env`** (plus the migrate script, which must run without the config file).
- **Relative imports end in `.js`**, also for `.ts` files. This is required by Node's ESM resolution, which the TypeScript config follows.

## Request flow

[`src/app.ts`](../src/app.ts) registers the middleware in this order:

1. **Request logging** (`pino-http`).
2. **Security headers** (`helmet`). `Cross-Origin-Resource-Policy` is set to `same-site` so a frontend on a sibling subdomain can embed images from the API.
3. **CORS**, allowing only the origins from the config, with credentials.
4. **Origin check**, the CSRF protection. See [Authentication](authentication.md#csrf-protection).
5. **JSON body parser**, limited to 1 MB.
6. `/health` and, if enabled, `/docs`. They are mounted before the session middleware, so they never touch the session store.
7. **Session middleware**, then the `/auth` and `/notes` routers.
8. **404 handler** for unknown routes.
9. **Error handler**.

## Validation

Route handlers validate input with `parse()` from [`src/shared/validate.ts`](../src/shared/validate.ts):

```ts
notesRouter.patch('/:id', async (req, res) => {
  const { id } = parse(noteParamsSchema, req.params);
  const note = await updateNote(currentUserId(req), id, parse(updateNoteSchema, req.body));
  res.json({ note });
});
```

`parse()` returns the typed, validated data or throws a 400 with a list of failing fields.

## Error handling

Services and handlers throw an `HttpError` from [`src/shared/errors.ts`](../src/shared/errors.ts), usually through a helper:

```ts
if (!note) throw notFound('Note not found');
```

Express 5 forwards errors from async handlers automatically, so no `try/catch` is needed in routes. The [error handler](../src/shared/middleware/error-handler.ts) turns every error into the same JSON shape:

```json
{ "error": { "message": "Validation failed", "details": [{ "path": "title", "message": "…" }] } }
```

`details` is only present for validation errors. Anything that is not an expected error is logged and answered with a generic 500, so internals never leak to the client.

## Adding a new feature

For a feature called `tasks`:

1. Create `src/features/tasks/`.
2. **`tasks.table.ts`:** define the Drizzle tables. Any file matching `src/features/**/*.table.ts` is picked up automatically.
3. Run `pnpm db:generate` to create the migration, then `pnpm db:migrate`.
4. **`tasks.schemas.ts`:** zod schemas for request bodies, params and the response shape.
5. **`tasks.service.ts`:** the logic and queries. Scope every query to the user id if the data is private.
6. **`tasks.routes.ts`:** the router. Add `tasksRouter.use(requireAuth)` if all routes need a session.
7. Mount it in [`src/app.ts`](../src/app.ts): `app.use("/tasks", tasksRouter)`.
8. **`tasks.openapi.ts`:** export `registerTasksDocs(registry)` and call it in [`src/features/docs/docs.document.ts`](../src/features/docs/docs.document.ts).
9. **`tasks.test.ts`:** tests, using the helpers from `src/test/helpers.ts`.
10. Add the new router to the route coverage test in [`src/features/docs/docs.test.ts`](../src/features/docs/docs.test.ts), so undocumented endpoints fail the test suite.
