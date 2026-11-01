# express-api-base

The reference API of the workspace: Express 5, Drizzle on Postgres, Zod, cookie sessions. It serves `angular-base` with sign-up, sign-in, user management for admins and notes with images. Accounts and admin come from `server-auth`, the infrastructure from `server-core`, so the app itself only holds the `notes` feature and the OpenAPI document. A new API app takes it as its template.

| Item     | Value                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Folder   | [apps/express-api-base](../../apps/express-api-base)                                                      |
| Tags     | `type:api-app`, `scope:base`                                                                              |
| Locally  | <http://localhost:3000>, API reference at <http://localhost:3000/docs>                                    |
| Database | `express_api_base`, tests `express_api_base_test`                                                         |
| Libs     | `server-core`, `server-auth`, `contracts`                                                                 |
| Image    | `ghcr.io/<owner>/nx1-express-api-base`, tag `nx1-express-api-base-v*`, see [Deployment](../deployment.md) |

## Running it

Postgres runs from the `docker-compose.yml` of the workspace. Once:

```bash
cp apps/express-api-base/.env.example apps/express-api-base/.env
```

Set `SESSION_SECRET` in that file (at least 32 characters, e.g. `openssl rand -hex 32`), then create the tables:

```bash
pnpm nx run express-api-base:db:migrate
```

Then, every time:

```bash
pnpm nx serve express-api-base
```

`serve` runs `tsx watch` and restarts on change. The first start creates the admin from `admin` in [config/development.json](../../apps/express-api-base/config/development.json).

| Target        | What it does                                                       |
| ------------- | ------------------------------------------------------------------ |
| `serve`       | Dev server with `tsx watch`, loads `.env`                          |
| `build`       | Bundle with rolldown into `dist/apps/express-api-base`             |
| `start`       | Build and run the bundle                                           |
| `test`        | Vitest against Postgres, see [Testing](../backend/testing.md)      |
| `db:generate` | New migration from changed `*.table.ts`, including the auth tables |
| `db:migrate`  | Apply pending migrations to `DATABASE_URL` from `.env`             |
| `db:studio`   | Drizzle Studio                                                     |

## Endpoints

| Path       | From          | Content                                                      |
| ---------- | ------------- | ------------------------------------------------------------ |
| `/auth/…`  | `server-auth` | Sign-up, sign-in, sign-out, `/auth/me`                       |
| `/admin/…` | `server-auth` | Users for admins: list, change role, delete, revoke sessions |
| `/notes/…` | app           | Notes of the signed-in user with image uploads               |
| `/health`  | `server-core` | `{ "status": "ok" }`                                         |
| `/docs`    | `server-core` | OpenAPI document and Swagger UI, when `docs.enabled` is set  |

## Configuration

Secrets in the environment (`CONFIG_PATH`, `DATABASE_URL`, `SESSION_SECRET`), everything else in `config/*.json`. The shared keys are in [Configuration](../backend/configuration.md), the app adds only `uploads.maxImagesPerNote` with `extendConfig()` in [src/config/index.ts](../../apps/express-api-base/src/config/index.ts).

## How it is built

Feature folders with a file per role (`*.table.ts`, `*.routes.ts`, `*.service.ts`, `*.openapi.ts`, `*.test.ts`), explained in [Backend architecture](../backend/architecture.md). The topic pages under [backend/](../README.md#backend) use this app for their examples.
