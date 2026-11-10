# vyte-api

The backend of vyte, event planning with a guest list and a personal link per guest. Right now it is the skeleton: the accounts of `server-auth` (sign-in, account links, the admin endpoints) on the shared infrastructure of `server-core`. The events, guests and answers follow the [specification](../vyte/spec.md). Built like `express-api-base`, so this page only covers what differs.

| Item     | Value                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| Folder   | [apps/vyte-api](../../apps/vyte-api)                                                           |
| Tags     | `type:api-app`, `scope:vyte`                                                                   |
| Locally  | <http://localhost:3300>, routes under `/api/v1`, API reference at <http://localhost:3300/docs> |
| Database | `vyte_api`, tests `vyte_api_test`                                                              |
| Libs     | `server-core`, `server-auth`, `vyte-contracts` once the features use it                        |
| Image    | `ghcr.io/<owner>/nx1-vyte-api`, tag `nx1-vyte-api-v*`, see [Deployment](../deployment.md)      |

## Running it

Once:

```bash
cp apps/vyte-api/.env.example apps/vyte-api/.env
```

Set `SESSION_SECRET` in that file (at least 32 characters, e.g. `openssl rand -hex 32`), then create the tables:

```bash
pnpm nx run vyte-api:db:migrate
```

Then, every time:

```bash
pnpm nx serve vyte-api
```

The targets are those of [express-api-base](express-api-base.md#running-it). The first start creates the admin from `admin` in [config/development.json](../../apps/vyte-api/config/development.json). The admin creates further accounts through account links.

## Endpoints

All under `/api/v1`, only `/health` and `/docs` are at the root.

| Path                           | From          | Content                                                                      |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------- |
| `/auth/…`                      | `server-auth` | Sign-in, sign-out, `/auth/me`; `POST /auth/sign-up` answers 403 while closed |
| `/auth/account-invites/:token` | `server-auth` | Account links: read the name, create the account and sign in (public)        |
| `/admin/…`                     | `server-auth` | Users for admins: list, change role, delete, revoke sessions                 |
| `/admin/account-invites`       | `server-auth` | Account links for admins: list open ones, create, revoke                     |
| `/health`                      | `server-core` | `{ "status": "ok", "version": "…" }` with the version of `package.json`      |
| `/docs`                        | `server-core` | OpenAPI document and Swagger UI, when `docs.enabled` is set                  |

The event routes (events, guests, answers, photos) are not there yet. The spec lists them in [section 6](../vyte/spec.md#6-api-draft).

## Differences to express-api-base

- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Sign-up closed**: `auth.signUpEnabled` is `false` in development and production. The shared sign-up route stays and answers 403. Accounts come from account links of an admin, see [server-auth](../libs/server-auth.md#in-an-app). Both account link routers are mounted here. Links work once and for 7 days, see [Authentication](../backend/authentication.md#account-links)
- **Cookie**: `sid` in development, `__Host-sid` in production (`session.cookieName`). The `__Host-` prefix requires `Secure`, which production sets
- **Docs off in production**: `docs.enabled` is `false` in [production.example.json](../../apps/vyte-api/config/production.example.json), so `/docs` is not mounted there
- **Port**: 3300 locally, 3000 in the container, so all products run side by side
- **No features yet**: no `notes`, no upload route. The Dockerfile and the stack still provide the `uploads/` folder for the features that follow
- **Config**: no own keys yet, `extendConfig({})` in [src/config/index.ts](../../apps/vyte-api/src/config/index.ts). The spec adds `photos.*` and its own rate limits for the token routes
