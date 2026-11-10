# server-core

The base of every API app. Knows no features.

| Item    | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Folder  | [packages/server/core](../../packages/server/core/src)         |
| Alias   | `@server/core/*`, e.g. `@server/core/errors`                   |
| Tags    | `type:server`, `scope:shared`                                  |
| Used by | `express-api-base`, `portfolio-api`, `vyte-api`, `server-auth` |

## Contents

| File                       | What it holds                                                                              | Guide                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `config.ts`                | `config` with the shared keys, `extendConfig(fileShape, envShape?)` for the keys of an app | [Configuration](../backend/configuration.md)                      |
| `server.ts`                | `createServer({ routes, middleware, prefix, docs, version })`, `startServer()`             | [Backend architecture](../backend/architecture.md#request-flow)   |
| `errors.ts`, `validate.ts` | `HttpError` with helpers like `notFound()`, `parse()` for request input                    | [Backend architecture](../backend/architecture.md#error-handling) |
| `logger.ts`                | pino, redacts `Cookie` and `Set-Cookie`                                                    | [Authentication](../backend/authentication.md#rate-limiting)      |
| `middleware/`              | Error handler, origin check against CSRF, `createRateLimit()`                              | [Authentication](../backend/authentication.md#csrf-protection)    |
| `db/`                      | `db`, `pool`, `runMigrations()`                                                            | [Database](../backend/database.md)                                |
| `images.ts`                | Image processing with sharp: pixel limit, WebP, save, remove                               | [Notes and images](../backend/notes-and-images.md)                |
| `openapi.ts`               | Helpers for the `*.openapi.ts` of the features, `buildOpenApiDocument()`                   | [Backend architecture](../backend/architecture.md)                |
| `testing/global-setup.ts`  | Creates and migrates the test database of a project                                        | [Testing](../backend/testing.md)                                  |

## Rules

- Only `config.ts` reads `process.env`. Keys added to the shared config later have a default, so the file of a running deployment stays valid
- One process is one app: `config`, `db` and `logger` are module singletons
