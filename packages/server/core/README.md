# server-core

The base of every API app: config loader (`config`, `extendConfig()`), logger, `HttpError` and its helpers, request validation, the error handler, the origin check, the database (`db`, `pool`, `runMigrations()`), OpenAPI helpers, `createServer()` / `startServer()` and `sanitizeRichText()` for stored rich text. `testing/global-setup.ts` creates and migrates the test database for Vitest.

Knows no features. Imported through `@server/core/*`, e.g. `@server/core/errors`.

Details: [docs/libs/server-core.md](../../../docs/libs/server-core.md)
