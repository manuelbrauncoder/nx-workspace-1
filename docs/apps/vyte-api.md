# vyte-api

The backend of vyte, event planning with a guest list and a personal link per guest. It has the accounts of `server-auth` (sign-in, account links, the admin endpoints) and the events with their images, on the shared infrastructure of `server-core`. The guests and answers follow the [specification](../vyte/spec.md). Built like `express-api-base`, so this page only covers what differs.

| Item     | Value                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| Folder   | [apps/vyte-api](../../apps/vyte-api)                                                           |
| Tags     | `type:api-app`, `scope:vyte`                                                                   |
| Locally  | <http://localhost:3300>, routes under `/api/v1`, API reference at <http://localhost:3300/docs> |
| Database | `vyte_api`, tests `vyte_api_test`                                                              |
| Libs     | `server-core`, `server-auth`, `vyte-contracts` (the event schemas)                             |
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
| `/events/…`                    | `vyte-api`    | Events and their images, see [Events](#events)                               |
| `/health`                      | `server-core` | `{ "status": "ok", "version": "…" }` with the version of `package.json`      |
| `/docs`                        | `server-core` | OpenAPI document and Swagger UI, when `docs.enabled` is set                  |

The guest, answer and photo routes are not there yet. The spec lists them in [section 6](../vyte/spec.md#6-api-draft).

## Events

Code in [src/features/events](../../apps/vyte-api/src/features/events): `events.table.ts` (tables `events`, `event_members`, `event_images`), `events.routes.ts`, `events.service.ts`, `events.images.ts` (multer), `events.time.ts` (past), `events.sanitize.ts`, `events.user-deletion.ts`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md).

| Method and path                        | Who           | Content                                                                |
| -------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| `GET /events`                          | member        | `{ events }` with `role`; upcoming first (soonest first), then past    |
| `POST /events`                         | signed in     | 201, `{ event }`; the caller becomes owner                             |
| `GET /events/{id}`                     | member        | `{ event }`                                                            |
| `PATCH /events/{id}`                   | owner, editor | `{ event }`, any subset of the fields                                  |
| `DELETE /events/{id}`                  | owner         | 204, also for a past event; the images go with it                      |
| `POST /events/{id}/images`             | owner, editor | multipart field `images`, 201, `{ images }`, appended                  |
| `PUT /events/{id}/images/order`        | owner, editor | `{ ids }` lists every image once, `{ images }`; the first is the cover |
| `GET /events/{id}/images/{imageId}`    | member        | the WebP file, `Cache-Control: private, immutable`                     |
| `DELETE /events/{id}/images/{imageId}` | owner, editor | `{ images }`; the rest move up                                         |

Rules in short:

- **404 or 403**: an event the user is not a member of is a 404, never a 403. An editor who deletes the event gets a 403.
- **Roles**: `event_members` holds the owner and the editors, every member route reads it. Creating an event inserts exactly one owner. No route changes roles yet, and the database does not enforce a single owner.
- **Past events** are computed, nothing is stored. An event is over at `endsAt`; an all-day event at the end of its last day; without an end at the end of the day it starts. All in the event's `timeZone`. Writes answer 409, the files stay readable, the owner can still delete.
- **Uploads**: membership and past are checked before multer reads the body, so a non-member or a past event never gets files parsed. Multer takes no text fields. Files above `uploads.maxFileSizeMb` answer 413.
- **Images**: up to 6 per event, `position` 0 is the cover. All-or-nothing: one invalid file or a passed limit stores nothing. More than 6 in total answers 409, and so does a request with 7 files. A request with 8 or more files is cut off by multer before the service runs and answers 400. Each file goes through `processImage()` and `saveImage()` of `server-core`, stored as WebP. Deleting an image renumbers the rest.
- **Description**: sanitized to `RICH_TEXT_TAGS`; links are kept only if `isAllowedRichTextHref(…, 'text')` of `@contracts/rich-text` allows them.
- **Deleting a user**: `events.user-deletion.ts` registers an `onUserDeleted()` hook. It deletes the events the user owns in one transaction with the events locked, and removes their files after the user is gone. Memberships as editor go with the user. See [Authentication](../backend/authentication.md#admin-endpoints).

## Differences to express-api-base

- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Sign-up closed**: `auth.signUpEnabled` is `false` in development and production. The shared sign-up route stays and answers 403. Accounts come from account links of an admin, see [server-auth](../libs/server-auth.md#in-an-app). Both account link routers are mounted here. Links work once and for 7 days, see [Authentication](../backend/authentication.md#account-links)
- **Cookie**: `sid` in development, `__Host-sid` in production (`session.cookieName`). The `__Host-` prefix requires `Secure`, which production sets
- **Docs off in production**: `docs.enabled` is `false` in [production.example.json](../../apps/vyte-api/config/production.example.json), so `/docs` is not mounted there
- **Port**: 3300 locally, 3000 in the container, so all products run side by side
- **Uploads**: the events store their files in the `uploads` folder of the base config, the Dockerfile and the stack provide it
- **Config**: no own keys yet, `extendConfig({})` in [src/config/index.ts](../../apps/vyte-api/src/config/index.ts). The spec adds `photos.*` and its own rate limits for the token routes
