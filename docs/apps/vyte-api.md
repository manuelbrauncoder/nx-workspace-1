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

| Path                           | From          | Content                                                                                |
| ------------------------------ | ------------- | -------------------------------------------------------------------------------------- |
| `/auth/…`                      | `server-auth` | Sign-in, sign-out, `/auth/me`; `POST /auth/sign-up` answers 403 while closed           |
| `/auth/account-invites/:token` | `server-auth` | Account links: read the name, create the account and sign in (public)                  |
| `/admin/…`                     | `server-auth` | Users for admins: list, change role, delete, revoke sessions                           |
| `/admin/account-invites`       | `server-auth` | Account links for admins: list open ones, create, revoke                               |
| `/events/…`                    | `vyte-api`    | Events and their images, see [Events](#events)                                         |
| `/events/:id/guests/…`         | `vyte-api`    | The guest list for the hosts, see [Guests](#guests)                                    |
| `/rsvp/:token…`                | `vyte-api`    | The personal link of a guest: read and answer, public, see [Guest links](#guest-links) |
| `/health`                      | `server-core` | `{ "status": "ok", "version": "…" }` with the version of `package.json`                |
| `/docs`                        | `server-core` | OpenAPI document and Swagger UI, when `docs.enabled` is set                            |

Not there yet: members and invites, save the date, the photo stand and photos, the CSV export and the calendar files. The spec lists them in [section 6](../vyte/spec.md#6-api-draft).

## Events

Code in [src/features/events](../../apps/vyte-api/src/features/events): `events.table.ts` (tables `events`, `event_members`, `event_images`), `events.routes.ts`, `events.service.ts`, `events.images.ts` (multer), `events.time.ts` (past), `events.user-deletion.ts`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md).

| Method and path                        | Who           | Content                                                                       |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `GET /events`                          | member        | `{ events }` with `role`, `counts`; upcoming first (soonest first), then past |
| `POST /events`                         | signed in     | 201, `{ event }`; the caller becomes owner                                    |
| `GET /events/{id}`                     | member        | `{ event }` with `role`, `counts`                                             |
| `PATCH /events/{id}`                   | owner, editor | `{ event }`, any subset of the fields                                         |
| `DELETE /events/{id}`                  | owner         | 204, also for a past event; the images go with it                             |
| `POST /events/{id}/images`             | owner, editor | multipart field `images`, 201, `{ images }`, appended                         |
| `PUT /events/{id}/images/order`        | owner, editor | `{ ids }` lists every image once, `{ images }`; the first is the cover        |
| `GET /events/{id}/images/{imageId}`    | member        | the WebP file, `Cache-Control: private, immutable`                            |
| `DELETE /events/{id}/images/{imageId}` | owner, editor | `{ images }`; the rest move up                                                |

Rules in short:

- **404 or 403**: an event the user is not a member of is a 404, never a 403. An editor who deletes the event gets a 403.
- **Roles**: `event_members` holds the owner and the editors, every member route reads it. Creating an event inserts exactly one owner. No route changes roles yet, and the database does not enforce a single owner.
- **Past events** are computed, nothing is stored. An event is over at `endsAt`; an all-day event at the end of its last day; without an end at the end of the day it starts. All in the event's `timeZone`. Writes answer 409, the files stay readable, the owner can still delete.
- **Uploads**: membership and past are checked before multer reads the body, so a non-member or a past event never gets files parsed. Multer takes no text fields. Files above `uploads.maxFileSizeMb` answer 413.
- **Images**: up to 6 per event, `position` 0 is the cover. All-or-nothing: one invalid file or a passed limit stores nothing. More than 6 in total answers 409, and so does a request with 7 files. A request with 8 or more files is cut off by multer before the service runs and answers 400. Each file goes through `processImage()` and `saveImage()` of `server-core`, stored as WebP. Deleting an image renumbers the rest.
- **Description**: sanitized with `sanitizeRichText()` of `@server/core/rich-text` to `RICH_TEXT_TAGS`; a link keeps its `href` only if `isAllowedRichTextHref(…, 'text')` of `@contracts/rich-text` allows it (absolute `http`, `https` or `mailto`).
- **Counts**: every event answer carries `counts` (`invited`, `coming`, `declined`, `pending`, `atMost`), computed from the guest list in one query per list, see section 5 of the [specification](../vyte/spec.md#5-guest-list-overview). `coming` is the accepted guests plus their companions, `atMost` all guests plus all allowances
- **Deleting a user**: `events.user-deletion.ts` registers an `onUserDeleted()` hook. It deletes the events the user owns in one transaction with the events locked, and removes their files after the user is gone. Memberships as editor go with the user. See [Authentication](../backend/authentication.md#admin-endpoints).

## Guests

Code in [src/features/guests](../../apps/vyte-api/src/features/guests): `guests.table.ts` (table `guests`, cascade with the event), `guests.routes.ts` (mounted at `/events/:id/guests`), `guests.service.ts`, `guests.openapi.ts`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md#contents), the tokens come from `src/shared/token.ts`.

| Method and path                              | Who           | Content                                                      |
| -------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `GET /events/{id}/guests`                    | member        | `{ guests }` with tokens, by name; also for a past event     |
| `POST /events/{id}/guests`                   | owner, editor | 201, `{ guest }`                                             |
| `POST /events/{id}/guests/bulk`              | owner, editor | `{ names, maxCompanions }`, 201, `{ guests }`                |
| `PATCH /events/{id}/guests/{guestId}`        | owner, editor | name, note or `maxCompanions`, `{ guest }`                   |
| `PUT /events/{id}/guests/{guestId}/response` | owner, editor | `{ response, companions }` recorded by a host, `{ guest }`   |
| `DELETE /events/{id}/guests/{guestId}`       | owner, editor | 204; the personal link stops working                         |
| `POST /events/{id}/guests/{guestId}/token`   | owner, editor | new link, `{ guest }`; the old token answers 404 from now on |

Rules in short:

- **Access**: every route runs the membership check of the events, so a non-member gets 404. Reads work on past events, every write answers 409 there.
- **Limits**: 500 guests per event, a request that would pass it answers 409. A pasted list takes up to 100 names (400 beyond), each name is one guest with the same allowance. Allowances run from 0 to 10 companions.
- **Answers**: a host answer of `accepted` sets `answeredBy: 'host'`, `declined` counts no companions. More companions than the allowance answers 400.
- **Lowering the allowance**: if the guest has more companions than the new `maxCompanions`, the companions drop to it and `companionsReduced` becomes `true`. The next answer, by the host or by the guest, clears the flag.
- **Edits never change the answer**: name, note and allowance are the only fields `PATCH` takes.
- **Locks**: a write locks the event row, so limits are counted against a stable list. Answers and allowance changes lock the guest row, so two answers at once end as one of them.
- **Tokens**: 32 random bytes, base64url, unique. The link is never in a query string, see [Authentication](../backend/authentication.md#what-the-request-log-keeps).
- **Caching**: the whole router sends `Cache-Control: no-store`, the lists carry live tokens.
- **Not there yet**: `GET /events/{id}/guests/export` (CSV).

## Guest links

Code in [src/features/rsvp](../../apps/vyte-api/src/features/rsvp): `rsvp.routes.ts` (mounted at `/rsvp`), `rsvp.service.ts`, `rsvp.openapi.ts`. The guest's page is the web app's, the API serves what it reads and writes. Public, no session.

| Method and path                      | Content                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `GET /rsvp/{token}`                  | `{ invitation }`, see below                                                            |
| `PUT /rsvp/{token}`                  | `{ response, companions, message }` of the guest, `{ invitation }` with the new answer |
| `GET /rsvp/{token}/images/{imageId}` | an image of the event, the WebP file                                                   |

Rules in short:

- **Two shapes of `invitation`**: `past: false` carries `open` (whether answers are open), the event without guest list (host names only, never an email, no tokens) and the guest's own answer. `past: true` carries the title only, and the images stop too (404).
- **Open until**: the `rsvpDeadline`, or the start of the event without one. Not after that and not once the event is past, `PUT` answers 409 `Answers are closed`. Companions are checked against the allowance (400). A decline counts no companions. The message is stored trimmed, an empty one means none.
- **Same 404 for every bad link**: unknown, renewed, removed, malformed. The body is the same.
- **Rate limit**: only `PUT` is limited, per client IP, with `rateLimit.rsvpWindowMinutes` and `rateLimit.rsvpMaxRequests` (429 when exceeded). `GET` has no limit, because the web app renders the page on the server and every guest arrives from the same IP. A token of 32 random bytes cannot be guessed.
- **Caching**: the invitation answers and `PUT` send `Cache-Control: no-store`. Images send `private, no-cache`, so a renewed link or the end of the event takes effect at once.
- **Not there yet**: `GET /rsvp/{token}/calendar` (the `.ics` file).

## Differences to express-api-base

- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Sign-up closed**: `auth.signUpEnabled` is `false` in development and production. The shared sign-up route stays and answers 403. Accounts come from account links of an admin, see [server-auth](../libs/server-auth.md#in-an-app). Both account link routers are mounted here. Links work once and for 7 days, see [Authentication](../backend/authentication.md#account-links)
- **Cookie**: `sid` in development, `__Host-sid` in production (`session.cookieName`). The `__Host-` prefix requires `Secure`, which production sets
- **Docs off in production**: `docs.enabled` is `false` in [production.example.json](../../apps/vyte-api/config/production.example.json), so `/docs` is not mounted there
- **Port**: 3300 locally, 3000 in the container, so all products run side by side
- **Uploads**: the events store their files in the `uploads` folder of the base config, the Dockerfile and the stack provide it
- **Config**: own keys in [src/config/index.ts](../../apps/vyte-api/src/config/index.ts), merged into the shared `rateLimit`: `rateLimit.rsvpWindowMinutes` (15 in development) and `rateLimit.rsvpMaxRequests` (60). Both are required, there is no default. The spec adds `photos.*` for the photo routes, see [section 3](../vyte/spec.md#3-domain-model)
