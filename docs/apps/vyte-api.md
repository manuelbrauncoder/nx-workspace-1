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

| Path                                         | From          | Content                                                                                                 |
| -------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `/auth/…`                                    | `server-auth` | Sign-in, sign-out, `/auth/me`; `POST /auth/sign-up` answers 403 while closed                            |
| `/auth/account-invites/:token`               | `server-auth` | Account links: read the name, create the account and sign in (public)                                   |
| `/admin/…`                                   | `server-auth` | Users for admins: list, change role, delete, revoke sessions                                            |
| `/admin/account-invites`                     | `server-auth` | Account links for admins: list open ones, create, revoke                                                |
| `/events/…`                                  | `vyte-api`    | Events and their images, see [Events](#events)                                                          |
| `/events/:id/guests/…`                       | `vyte-api`    | The guest list for the hosts, see [Guests](#guests)                                                     |
| `/events/:id/members`, `/owner`, `/invites…` | `vyte-api`    | The team: members, hand-over and editor invites, see [Team](#team)                                      |
| `/rsvp/:token…`                              | `vyte-api`    | The personal link of a guest: read and answer, public, see [Guest links](#guest-links)                  |
| `/invites/:token…`                           | `vyte-api`    | The link of an editor invite: read, accept, or sign up through it, see [Team](#team)                    |
| `/events/:id/save-the-date…`                 | `vyte-api`    | Save the date of an event, turned on, off and renewed by the hosts, see [Save the date](#save-the-date) |
| `/save-the-date/:token…`                     | `vyte-api`    | The public save-the-date link: page, calendar file and cover, see [Save the date](#save-the-date)       |
| `/health`                                    | `server-core` | `{ "status": "ok", "version": "…" }` with the version of `package.json`                                 |
| `/docs`                                      | `server-core` | OpenAPI document and Swagger UI, when `docs.enabled` is set                                             |

Not there yet: the photo stand and photos, the CSV export. The spec lists them in [section 6](../vyte/spec.md#6-api-draft).

## Events

Code in [src/features/events](../../apps/vyte-api/src/features/events): `events.table.ts` (tables `events`, `event_members`, `event_images`), `events.routes.ts`, `events.service.ts`, `events.images.ts` (multer), `events.time.ts` (past, local dates), `events.calendar.ts` (the `.ics` files, see [Calendar files](#calendar-files)), `events.user-deletion.ts`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md).

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
- **Roles**: `event_members` holds the owner and the editors, every member route reads it. Creating an event inserts exactly one owner. Only the hand-over changes roles, see [Team](#team). The database does not enforce a single owner.
- **Past events** are computed, nothing is stored. An event is over at `endsAt`; an all-day event at the end of its last day; without an end at the end of the day it starts. All in the event's `timeZone`. Writes answer 409, the files stay readable, the owner can still delete. An editor can still leave, see [Team](#team). Turning a save-the-date link off still works, see [Save the date](#save-the-date).
- **Caching**: the JSON answers of the event routes (`GET`, `POST`, `PATCH`) send `Cache-Control: no-store`, because they carry the save-the-date link. The image files keep `private, immutable`.
- **Uploads**: membership and past are checked before multer reads the body, so a non-member or a past event never gets files parsed. Multer takes no text fields. Files above `uploads.maxFileSizeMb` answer 413.
- **Images**: up to 6 per event, `position` 0 is the cover. All-or-nothing: one invalid file or a passed limit stores nothing. More than 6 in total answers 409, and so does a request with 7 files. A request with 8 or more files is cut off by multer before the service runs and answers 400. Each file goes through `processImage()` and `saveImage()` of `server-core`, stored as WebP. Deleting an image renumbers the rest.
- **Description**: sanitized with `sanitizeRichText()` of `@server/core/rich-text` to `RICH_TEXT_TAGS`; a link keeps its `href` only if `isAllowedRichTextHref(…, 'text')` of `@contracts/rich-text` allows it (absolute `http`, `https` or `mailto`).
- **Counts**: every event answer carries `counts` (`invited`, `coming`, `declined`, `pending`, `atMost`), computed from the guest list in one query per list, see section 5 of the [specification](../vyte/spec.md#5-guest-list-overview). `coming` is the accepted guests plus their companions, `atMost` all guests plus all allowances
- **Deleting a user**: `events.user-deletion.ts` registers an `onUserDeleted()` hook. The hook runs in the transaction that deletes the user and gets it. It locks every event the user is a member of, then deletes the events the user owns, and removes their files after the commit. Memberships as editor go with the user. If the hook throws, the deletion is rolled back. See [Authentication](../backend/authentication.md#deleting-a-user).

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
| `GET /rsvp/{token}/calendar`         | the `.ics` file of the event with place name and address, 404 once the event is past   |

Rules in short:

- **Two shapes of `invitation`**: `past: false` carries `open` (whether answers are open), the event without guest list (host names only, never an email, no tokens) and the guest's own answer. `past: true` carries the title only, and the images stop too (404).
- **Open until**: the `rsvpDeadline`, or the start of the event without one. Not after that and not once the event is past, `PUT` answers 409 `Answers are closed`. Companions are checked against the allowance (400). A decline counts no companions. The message is stored trimmed, an empty one means none.
- **Same 404 for every bad link**: unknown, renewed, removed, malformed. The body is the same.
- **Rate limit**: only `PUT` is limited, per client IP, with `rateLimit.rsvpWindowMinutes` and `rateLimit.rsvpMaxRequests` (429 when exceeded). `GET` has no limit, because the web app renders the page on the server and every guest arrives from the same IP. A token of 32 random bytes cannot be guessed.
- **Caching**: the invitation answers, `PUT` and the calendar file send `Cache-Control: no-store`. Images send `private, no-cache`, so a renewed link or the end of the event takes effect at once.
- **Calendar**: the same 404 as a bad link once the event is past. The file is described in [Calendar files](#calendar-files).

## Team

Code in [src/features/team](../../apps/vyte-api/src/features/team): `team.table.ts` (table `editor_invites`), `team.routes.ts` (mounted at `/events/:id`, `requireAuth` per route), `team.service.ts`, `team.openapi.ts`. Code in [src/features/invites](../../apps/vyte-api/src/features/invites): `invites.routes.ts` (mounted at `/invites`), `invites.service.ts`, `invites.openapi.ts`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md#contents). The link routes read their token through `tokenParams()` in [src/shared/token-params.ts](../../apps/vyte-api/src/shared/token-params.ts), the guest links do the same.

| Method and path                          | Who                        | Content                                                                                                   |
| ---------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /events/{id}/members`               | member                     | `{ members }`: owner first, then the editors by join time                                                 |
| `DELETE /events/{id}/members/{userId}`   | owner; editor for themself | 204; removes an editor or leaves, the owner cannot be removed (409)                                       |
| `PUT /events/{id}/owner`                 | owner                      | `{ userId }` of an editor, swaps the roles, `{ members }`                                                 |
| `GET /events/{id}/invites`               | owner                      | `{ invites }`: open invites with their tokens, `no-store`                                                 |
| `POST /events/{id}/invites`              | owner                      | 201, `{ invite }` with token and expiry, `no-store`                                                       |
| `DELETE /events/{id}/invites/{inviteId}` | owner                      | 204, only an unused invite                                                                                |
| `GET /invites/{token}`                   | anyone                     | `{ invite }`: event title, start, `allDay`, `timeZone`, the owner's name if set, `no-store`               |
| `POST /invites/{token}/accept`           | signed in                  | `{ event }`, the caller is an editor now, `no-store`                                                      |
| `POST /invites/{token}/sign-up`          | anyone                     | 201, `{ event }`; `{ email, password, name? }` creates the account, signs in, makes an editor, `no-store` |

Rules in short:

- **Members**: every member sees the list, a non-member gets 404. Each row carries `userId`, `name`, `email`, `role` and `joinedAt`.
- **Removing**: the owner removes an editor (an editor removing someone else gets 403, a past event 409). An editor leaves, also after the event. Nobody removes the owner: the owner hands the event over first, or deletes it.
- **Hand-over**: owner only, upcoming events only (409 on a past one), 409 when handing over to oneself, 404 when the target is no member. The target's row is locked. The old owner becomes an editor first, so the single-owner index holds at every step. Anything but one row changed on each side rolls the hand-over back.
- **Invites**: owner only. A link works once and for 7 days. An event has at most 10 open invites (409 beyond); used, expired and revoked ones do not count. Creating one for a past event answers 409. Revoking takes an unused invite; a used one stays as the record of who joined through it.
- **Accepting**: the first use makes the caller an editor, up to 10 editors (409 beyond, the link stays open). A member who opens the link gets the event and the link stays open. The editor who used the link gets the event again while they are a member; after they left, the link answers 404.
- **Sign-up through a link**: works while sign-up is closed, the link is the permission. The link is checked before the password is hashed, and checked again inside the transaction. A taken email answers 409 and leaves the link open. The name is optional.
- **Same 404 for every dead link**: unknown, malformed, used, expired, revoked, or one to a past event. The body is the same on all three routes.
- **Rate limit**: accepting and signing up count against the sign-up limit of `server-auth`. Reading the link has none.
- **Locks**: the event row first, then the invite row. Two people with one link make exactly one editor.
- **Caching**: the routes that return tokens send `Cache-Control: no-store`. That includes accepting and signing up through an invite, because they answer with the event and its save-the-date link.

## Save the date

Code in [src/features/save-the-date](../../apps/vyte-api/src/features/save-the-date): `save-the-date.routes.ts` (host router at `/events/:id/save-the-date`, public router at `/save-the-date`), `save-the-date.service.ts`, `save-the-date.openapi.ts`. The table `events` has the columns `save_the_date_token` (unique, `null` while it is off) and `save_the_date_note`. The schemas are in [vyte-contracts](../libs/vyte-contracts.md#contents).

| Method and path                         | Who           | Content                                                                                                                       |
| --------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PUT /events/{id}/save-the-date`        | owner, editor | `{ note }` (optional, empty means none); turns it on, creates the link once, or changes the note, `{ event }`                 |
| `DELETE /events/{id}/save-the-date`     | owner, editor | turns it off and removes the note, `{ event }`; also after the event                                                          |
| `POST /events/{id}/save-the-date/token` | owner, editor | new link, `{ event }`; the old one answers 404 from now on                                                                    |
| `GET /save-the-date/{token}`            | public        | `{ saveTheDate }`: title, date, `allDay`, `timeZone`, place name, note, cover size; after the event only `past` and the title |
| `GET /save-the-date/{token}/calendar`   | public        | the `.ics` file with the place name only, 404 once the event is past                                                          |
| `GET /save-the-date/{token}/cover`      | public        | the image at position 0, `private, no-cache`; 404 without an image or once the event is past                                  |

Rules in short:

- **Host routes**: `requireAuth` and `Cache-Control: no-store`. A non-member gets 404, as everywhere in the events.
- **Turning on and renewing** need an upcoming event (409 on a past one). Renewing while it is off answers 404. A change of the note needs an upcoming event too.
- **Turning off** works after the event, so a link that went somewhere unwanted can still be stopped. It removes the note as well.
- **Public link**: one token per event, no session. An unknown, renewed, turned-off or malformed link answers the same 404 with the same body. Once the event is past, the page shows only the title, and the calendar file and the cover answer 404.
- **Privacy**: the link shows the place name, never the address or the names of hosts and guests.
- **Rate limit**: none on the reads, because the web app renders the page on the server and every visitor would share its IP. The save-the-date routes have no public writes.
- **Caching**: the host routes and the page send `no-store`. The cover is `private, no-cache`, so turning the link off or renewing it takes effect at once.

## Calendar files

Code in [src/features/events/events.calendar.ts](../../apps/vyte-api/src/features/events/events.calendar.ts): `calendarFile()` builds the file, `fullLocation()` joins place name and address. The guest link ([Guest links](#guest-links)) and the save the date ([Save the date](#save-the-date)) use it. The file is served as `event.ics` with `text/calendar; charset=utf-8` and `no-store`.

- **Format**: RFC 5545 with CRLF line ends. Lines longer than 75 octets are folded. Backslash, comma, semicolon and line breaks in text are escaped, control characters are dropped.
- **Identity**: `UID` is `<eventId>@vyte`, `DTSTAMP` is the time of the download.
- **Timed events**: `DTSTART` and `DTEND` in UTC. Without an end, `DTEND` is left out.
- **All-day events**: `DTSTART` and `DTEND` as dates (`VALUE=DATE`) in the event's time zone. The end is exclusive, the day after the last day.
- **Location**: the guest link puts place name and address into `LOCATION`, the save the date only the place name.

## Differences to express-api-base

- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Sign-up closed**: `auth.signUpEnabled` is `false` in development and production. The shared sign-up route stays and answers 403. Accounts come from account links of an admin, see [server-auth](../libs/server-auth.md#in-an-app). Both account link routers are mounted here. Links work once and for 7 days, see [Authentication](../backend/authentication.md#account-links)
- **Cookie**: `sid` in development, `__Host-sid` in production (`session.cookieName`). The `__Host-` prefix requires `Secure`, which production sets
- **Docs off in production**: `docs.enabled` is `false` in [production.example.json](../../apps/vyte-api/config/production.example.json), so `/docs` is not mounted there
- **Port**: 3300 locally, 3000 in the container, so all products run side by side
- **Uploads**: the events store their files in the `uploads` folder of the base config, the Dockerfile and the stack provide it
- **Config**: own keys in [src/config/index.ts](../../apps/vyte-api/src/config/index.ts), merged into the shared `rateLimit`: `rateLimit.rsvpWindowMinutes` (15 in development) and `rateLimit.rsvpMaxRequests` (60). Both are required, there is no default. The spec adds `photos.*` for the photo routes, see [section 3](../vyte/spec.md#3-domain-model)
