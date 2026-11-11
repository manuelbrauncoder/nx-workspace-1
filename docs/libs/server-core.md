# server-core

The base of every API app. Knows no features.

| Item    | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Folder  | [packages/server/core](../../packages/server/core/src)         |
| Alias   | `@server/core/*`, e.g. `@server/core/errors`                   |
| Tags    | `type:server`, `scope:shared`                                  |
| Used by | `express-api-base`, `portfolio-api`, `vyte-api`, `server-auth` |

## Contents

| File                       | What it holds                                                                                                                                                                                                                 | Guide                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `config.ts`                | `config` with the shared keys, `extendConfig(fileShape, envShape?)` for the keys of an app                                                                                                                                    | [Configuration](../backend/configuration.md)                              |
| `server.ts`                | `createServer({ routes, middleware, prefix, docs, version })`, `startServer()`                                                                                                                                                | [Backend architecture](../backend/architecture.md#request-flow)           |
| `errors.ts`, `validate.ts` | `HttpError` with helpers like `notFound()`, `parse()` for request input                                                                                                                                                       | [Backend architecture](../backend/architecture.md#error-handling)         |
| `logger.ts`                | pino, redacts `Cookie`, `Set-Cookie`, `Referer` and `Location`, masks token segments of URLs (`redactTokens()` decodes the path, then masks every run of 43 or more base64url characters after a slash; `serializeRequest()`) | [Authentication](../backend/authentication.md#what-the-request-log-keeps) |
| `middleware/`              | Error handler (logs failed queries without their parameters), origin check against CSRF, `createRateLimit()`                                                                                                                  | [Authentication](../backend/authentication.md#csrf-protection)            |
| `db/`                      | `db`, `pool`, `runMigrations()`                                                                                                                                                                                               | [Database](../backend/database.md)                                        |
| `images.ts`                | Image processing with sharp: pixel limit, WebP, save, remove                                                                                                                                                                  | [Notes and images](../backend/notes-and-images.md)                        |
| `openapi.ts`               | Helpers for the `*.openapi.ts` of the features, `buildOpenApiDocument()`                                                                                                                                                      | [Backend architecture](../backend/architecture.md)                        |
| `rich-text.ts`             | `sanitizeRichText(html, profile)`: keeps the formats of `@contracts/rich-text`, link rules of profile `text` (notes, events) or `page` (legal pages)                                                                          | [Notes and images](../backend/notes-and-images.md#description-sanitizing) |
| `testing/global-setup.ts`  | Creates and migrates the test database of a project                                                                                                                                                                           | [Testing](../backend/testing.md)                                          |

## Tests

- `pnpm nx run server-core:test` runs the specs next to the code (`src/**/*.test.ts`) with vitest. They need no database
- `pnpm nx run server-core:typecheck` checks the lib with `tsconfig.lib.json` and the specs with `tsconfig.spec.json`. The specs are left out of the lib build

## Rules

- Only `config.ts` reads `process.env`. Keys added to the shared config later have a default, so the file of a running deployment stays valid
- One process is one app: `config`, `db` and `logger` are module singletons
- `sanitizeRichText()` is the only sanitizer of the API apps. A feature calls it before it stores rich text and does not write its own
