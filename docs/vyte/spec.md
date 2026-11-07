# vyte: specification

Status: **draft**, to be refined before the projects are generated. Nothing here is built yet. The folders [apps/vyte-web](../../apps/vyte-web) and [apps/vyte-api](../../apps/vyte-api) only hold a README.

## 1. Overview

vyte plans an event and keeps its guest list. The host creates an event, adds the guests and sends each of them a personal link. The guest opens the link, sees the event and accepts or declines, saying how many companions they bring. The host can invite other people to work on the list with them.

### Goals of v1

- Create, edit and delete events with title, description, up to six images, location, start and end, also all-day
- Keep a guest list per event, with an allowance of companions per guest (none, plus one, more). Add guests one by one or as a pasted list
- One personal link per guest; guests need no account
- Hosts see who accepted, declined or has not answered yet, and how many people come. They can record an answer a guest gave in person and export the list as CSV
- Work on an event together: the owner invites editors through a link and can hand the event over
- Closed sign-up: an admin creates an account by name and shares a link, the person sets email and password there
- Past events move to an archive, guest links then only say that the event is over
- German and English, mobile first, accessible (WCAG AA)

### Not in v1

- Sending emails or messages: links are copied or shared through the share sheet of the device
- Open sign-up, public event pages or a shared sign-up link for an event
- Names of companions, households with one answer per person, own questions per event (diet, allergies): the message of the guest covers it
- Embedded maps
- Payments, tickets, seating plans, check-in at the door
- Guests seeing each other
- Reminders and notifications

## 2. Roles

| Role   | Who                                                      | Account |
| ------ | -------------------------------------------------------- | ------- |
| Admin  | Role `admin` of `server-auth`, creates accounts          | yes     |
| Owner  | Created the event or took it over, exactly one per event | yes     |
| Editor | Joined through an invite link of the owner               | yes     |
| Guest  | Is on the guest list, has a personal link                | no      |

Accounts are the shared accounts of `server-auth`. Sign-up is off (`auth.signUpEnabled: false`), accounts come from an account link of an admin (section 4) or from an editor invite. The admin role has no rights on events it is not a member of.

| Action                                         | Owner | Editor |   Guest (own link)   |
| ---------------------------------------------- | :---: | :----: | :------------------: |
| See the event and the guest list               |   ✓   |   ✓    | event only, no list  |
| Edit the event and its images                  |   ✓   |   ✓    |          –           |
| Add, edit, remove guests; renew a guest link   |   ✓   |   ✓    |          –           |
| See all answers and counts; export CSV         |   ✓   |   ✓    |   own answer only    |
| Answer: accept or decline, companions, message |   –   |   –    | ✓ until the deadline |
| Record an answer for a guest                   |   ✓   |   ✓    |          –           |
| Create or revoke invite links for editors      |   ✓   |   –    |          –           |
| Remove an editor; hand the event to an editor  |   ✓   |   –    |          –           |
| Leave the event                                |   –   |   ✓    |          –           |
| Delete the event                               |   ✓   |   –    |          –           |

A past event is read-only for everyone: hosts can still read it, export the list and delete it (owner).

## 3. Domain model

Limits become constants in `vyte-contracts` (like `notes-limits`).

| Limit                 | Value      |
| --------------------- | ---------- |
| Guests per event      | 500        |
| Names per pasted list | 100        |
| Editors per event     | 10         |
| Images per event      | 6          |
| Companions per guest  | 10         |
| Events per user       | none in v1 |

### Event

| Field                    | Type              | Rules                                                                                                                                                                              |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | uuid              |                                                                                                                                                                                    |
| `title`                  | text              | required, 1–120 characters                                                                                                                                                         |
| `description`            | rich text (HTML)  | optional, at most 20 000 characters of HTML, formats of `RICH_TEXT_TAGS` (`@contracts/rich-text`), sanitized by the API                                                            |
| `locationName`           | text              | optional, at most 200 characters, e.g. "Gartenhaus"                                                                                                                                |
| `address`                | text              | optional, at most 500 characters, line breaks allowed. When set, the pages show a link "In Karte öffnen" to OpenStreetMap (`https://www.openstreetmap.org/search?query=<address>`) |
| `allDay`                 | boolean           | default `false`                                                                                                                                                                    |
| `startsAt`               | timestamp with tz | required. All-day: midnight of the first day in `timeZone`                                                                                                                         |
| `endsAt`                 | timestamp with tz | optional, not before `startsAt`. All-day: midnight of the last day, the event lasts until the end of that day                                                                      |
| `timeZone`               | IANA name         | required, from the browser of the creator, e.g. `Europe/Berlin`. Times are shown in it for everyone                                                                                |
| `rsvpDeadline`           | timestamp with tz | optional, not after `startsAt`. Without one, answers are open until `startsAt`                                                                                                     |
| `createdAt`, `updatedAt` | timestamp         |                                                                                                                                                                                    |

**Past**: an event is past after `endsAt`, without `endsAt` at the end of the day of `startsAt` (both in `timeZone`). Nothing is stored for it, the API computes it.

### EventImage

| Field             | Type    | Rules                                                                        |
| ----------------- | ------- | ---------------------------------------------------------------------------- |
| `id`              | uuid    |                                                                              |
| `eventId`         | uuid    | deleted with the event, the files go too                                     |
| `filename`        | text    | WebP file from `saveImage()` of `server-core`, same input types as the notes |
| `width`, `height` | integer | from `processImage()`, for `NgOptimizedImage`                                |
| `position`        | integer | 0–5, unique per event. Position 0 is the cover image                         |

### EventMember

| Field      | Type                  | Rules                       |
| ---------- | --------------------- | --------------------------- |
| `eventId`  | uuid                  | deleted with the event      |
| `userId`   | uuid                  | deleted with the user       |
| `role`     | `'owner' \| 'editor'` | exactly one owner per event |
| `joinedAt` | timestamp             |                             |

The owner is a member with the role `owner`, so every check runs over one table.

### CollaboratorInvite

| Field              | Type            | Rules                                                 |
| ------------------ | --------------- | ----------------------------------------------------- |
| `id`               | uuid            |                                                       |
| `eventId`          | uuid            | deleted with the event                                |
| `token`            | text            | 32 random bytes, base64url, unique                    |
| `createdBy`        | uuid            | the owner                                             |
| `expiresAt`        | timestamp       | 7 days after creation                                 |
| `usedAt`, `usedBy` | timestamp, uuid | set when accepted; a used invite cannot be used again |

The owner can revoke an open invite (delete it). An expired or used invite answers with 404 on the public endpoints, so a guessed token reveals nothing.

### Guest

| Field                    | Type                                    | Rules                                                                     |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| `id`                     | uuid                                    |                                                                           |
| `eventId`                | uuid                                    | deleted with the event                                                    |
| `name`                   | text                                    | required, 1–100 characters, as the host writes it ("Familie Weber")       |
| `note`                   | text                                    | optional, at most 500 characters, only for hosts                          |
| `maxCompanions`          | integer                                 | 0–10. 0 = comes alone, 1 = plus one, more for couples and families        |
| `token`                  | text                                    | 32 random bytes, base64url, unique. Renewing it replaces it               |
| `response`               | `'pending' \| 'accepted' \| 'declined'` | starts as `pending`                                                       |
| `companions`             | integer                                 | 0–`maxCompanions`, only meaningful when accepted, 0 otherwise             |
| `message`                | text                                    | optional, at most 500 characters, written by the guest                    |
| `answeredBy`             | `'guest' \| 'host'` or null             | who gave the last answer; `host` shows "vom Host eingetragen" in the list |
| `respondedAt`            | timestamp                               | time of the last answer                                                   |
| `createdAt`, `updatedAt` | timestamp                               |                                                                           |

A couple or family is one guest with an allowance ("Familie Weber", +3): one link, one answer for all. Lowering `maxCompanions` below the companions already given lowers `companions` to the new maximum; the list marks the guest so the hosts can tell them.

### AccountInvite (in `server-auth`)

| Field              | Type            | Rules                                                     |
| ------------------ | --------------- | --------------------------------------------------------- |
| `id`               | uuid            |                                                           |
| `name`             | text            | required, name of the new account, as the admin writes it |
| `token`            | text            | 32 random bytes, base64url, unique                        |
| `createdBy`        | uuid            | the admin, set null when that user is deleted             |
| `expiresAt`        | timestamp       | 7 days after creation                                     |
| `usedAt`, `usedBy` | timestamp, uuid | set when the account was created; cannot be used again    |

This is a new part of the shared `server-auth`, not of vyte: closed sign-up with links is useful for every app. Other apps get the table through their migrations but only offer it if they mount the routes.

## 4. Flows

### Accounts

1. An admin opens `/admin/users`, enters a name and gets an account link (`/welcome/:token`), which they copy or share
2. The person opens the link, sees "Willkommen, <name>", enters email and password (the name is prefilled and can be changed) and is signed in
3. An existing email answers with 409, as at sign-up. An expired or used link shows "Link ungültig" with status 404
4. The admin sees open account links and revokes them

### Event

1. A signed-in user creates an event and becomes its owner. Only the title and the start are required, all-day switches the time fields off
2. Owner and editors edit it on the event page. Images are uploaded, reordered and removed on their own, like the images of the notes (first the event as JSON, then the files). The first image is the cover
3. The owner deletes the event after a confirmation. Guests, members, invites and images go with it, guest links stop working

### Guests

1. Hosts add a guest with name, allowance of companions and an optional note
2. Or they paste a list, one name per line (empty lines ignored, up to 100), with one allowance for all. Each name becomes a guest; allowances are adjusted per guest afterwards
3. Each guest card has "Link kopieren" and, where the device offers it, "Teilen" (Web Share API with a short text and the link)
4. "Link erneuern" replaces the token after a confirmation; the old link stops working. For a link that went to the wrong person
5. "Antwort eintragen" lets a host set answer and companions for a guest who answered in person. The guest can still change it through the link
6. Editing name, note or allowance never changes the answer. Removing a guest asks first and ends their link
7. "Als CSV exportieren" downloads the list (section 5)

### Guest page (`/rsvp/:token`)

1. The guest opens their link, no account, no cookie banner needed (no tracking)
2. They see: cover image, title, date and time in the event's time zone (only dates when all-day), location and address with a map link, description, further images as a gallery (a click opens one large), deadline, and who invites them (names of owner and editors, only if a name is set, never an email)
3. They answer: "Ich komme" or "Ich komme nicht". When accepting and `maxCompanions > 0`, they choose how many companions they bring (0 to the allowance). An optional message to the hosts; its hint asks for allergies or food wishes
4. After answering they see their answer and can change it until the deadline (or until the start)
5. After the deadline the page shows the event and the last answer, without a form
6. After the event the page only shows the title and "Das Event ist vorbei", no details, no images
7. An unknown or renewed token shows "Einladung nicht gefunden" with status 404

### Collaborators

1. On the team page the owner creates an invite link and copies or shares it
2. The invited person opens `/invite/:token`. The page says who invites them to which event
3. Signed in: "Einladung annehmen" makes them an editor and opens the event. A member opening the link again just lands on the event
4. Signed out: two ways. "Anmelden" leads to sign-in with `returnUrl` back to the invite. "Konto erstellen" asks for name, email and password right on the page, creates the account, signs in and makes them an editor. The editor invite is the only way besides the admin link to get an account
5. The owner sees editors and open invites, removes editors and revokes open invites
6. The owner hands the event to an editor after a confirmation: that editor becomes owner, the old owner becomes editor
7. An editor can leave an event; it then disappears from their list

### Past events

- `/events` shows "Kommend" and "Vergangen"
- A past event opens read-only: no editing, no guest changes, no invites. Hosts can export the list and the owner can delete the event
- Nothing is deleted automatically

### Deleting an account

`vyte-api` registers an `onUserDeleted()` hook: events the user owns are deleted with their images, memberships as editor go with the cascade. The account page tells an owner to hand over events first.

## 5. Guest list overview

The event page shows the counts, the guest page the list.

| Count     | Meaning                                                               |
| --------- | --------------------------------------------------------------------- |
| Invited   | number of guests                                                      |
| Coming    | people expected: accepted guests plus their companions                |
| Declined  | guests who declined                                                   |
| No answer | guests with `pending`                                                 |
| At most   | everyone who could come: all guests plus all allowances, for planning |

- Filter by answer (all, coming, declined, no answer), search by name
- Each card: name, allowance ("+1", "+3"), answer with companions, "vom Host eingetragen" when a host answered, message of the guest, note of the hosts, time of the answer
- Sorted by name; "newest answers first" as a second order
- CSV export: one row per guest with name, allowance, answer, companions, people in total, message, note, answered by, time of the answer. UTF-8 with BOM and `;` as separator, so Excel opens it directly. File name `<title>-gaeste.csv`

## 6. API draft

Routes under `/api/v1` like `dartomat-api`, `/health` and `/docs` at the root. Answers wrapped in an object, errors in the usual format `{ error: { message, details? } }`. An event the user is not a member of answers with 404, a lacking role (editor wants to delete) with 403, a write to a past event with 409.

### Accounts (`server-auth`)

| Method and path                      | Who    | Content                                                                                          |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------ |
| `GET /admin/account-invites`         | admin  | `{ invites }`: open account links                                                                |
| `POST /admin/account-invites`        | admin  | `{ name }`, `{ invite }` with token and expiry                                                   |
| `DELETE /admin/account-invites/{id}` | admin  | 204                                                                                              |
| `GET /auth/account-invites/{token}`  | public | `{ invite }`: the name                                                                           |
| `POST /auth/account-invites/{token}` | public | `{ name, email, password }`, creates the account and signs in, `{ user }`. 409 for a taken email |

Both reuse `signUp()` and `startSession()` of `server-auth` and ignore `auth.signUpEnabled`.

### Events (session required)

| Method and path                        | Who           | Content                                                            |
| -------------------------------------- | ------------- | ------------------------------------------------------------------ |
| `GET /events`                          | member        | `{ events }`: own events with role, counts, cover image and `past` |
| `POST /events`                         | signed in     | creates an event, the caller becomes owner, `{ event }`            |
| `GET /events/{id}`                     | member        | `{ event }` with role, counts, images and `past`                   |
| `PATCH /events/{id}`                   | owner, editor | changes fields, `{ event }`                                        |
| `DELETE /events/{id}`                  | owner         | 204, also for a past event                                         |
| `POST /events/{id}/images`             | owner, editor | `FormData` with files, appended up to 6, `{ images }`              |
| `PUT /events/{id}/images/order`        | owner, editor | `{ ids }` in the new order, `{ images }`                           |
| `DELETE /events/{id}/images/{imageId}` | owner, editor | `{ images }`                                                       |
| `GET /events/{id}/images/{imageId}`    | member        | the WebP file                                                      |

### Guests (session required, owner or editor)

| Method and path                              | Content                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| `GET /events/{id}/guests`                    | `{ guests }` with tokens, so links can be copied                |
| `GET /events/{id}/guests/export`             | the CSV file (`text/csv`), also for a past event                |
| `POST /events/{id}/guests`                   | adds one guest, `{ guest }`                                     |
| `POST /events/{id}/guests/bulk`              | `{ names, maxCompanions }`, adds up to 100 guests, `{ guests }` |
| `PATCH /events/{id}/guests/{guestId}`        | name, note, `maxCompanions`, `{ guest }`                        |
| `PUT /events/{id}/guests/{guestId}/response` | `{ response, companions }` recorded by a host, `{ guest }`      |
| `DELETE /events/{id}/guests/{guestId}`       | 204                                                             |
| `POST /events/{id}/guests/{guestId}/token`   | new token, `{ guest }`                                          |

### Members and invites

| Method and path                          | Who                        | Content                                                                                 |
| ---------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `GET /events/{id}/members`               | member                     | `{ members }`: name, email, role                                                        |
| `DELETE /events/{id}/members/{userId}`   | owner; editor for themself | removes an editor or leaves; the owner cannot be removed (409)                          |
| `PUT /events/{id}/owner`                 | owner                      | `{ userId }` of an editor, swaps the roles, `{ members }`                               |
| `GET /events/{id}/invites`               | owner                      | `{ invites }`: open invites                                                             |
| `POST /events/{id}/invites`              | owner                      | `{ invite }` with token and expiry                                                      |
| `DELETE /events/{id}/invites/{inviteId}` | owner                      | 204                                                                                     |
| `GET /invites/{token}`                   | public                     | `{ invite }`: event title, date, name of the owner                                      |
| `POST /invites/{token}/accept`           | signed in                  | becomes editor, `{ event }`. Already a member: same answer                              |
| `POST /invites/{token}/sign-up`          | public                     | `{ name, email, password }`, creates the account, signs in, becomes editor, `{ event }` |

### RSVP (public, rate limited per IP)

| Method and path                      | Content                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /rsvp/{token}`                  | `{ invitation }`: the event without guest list, the own guest, whether answers are open, `past`. A past event without details |
| `PUT /rsvp/{token}`                  | `{ response, companions, message }`, `{ invitation }`. 409 after the deadline                                                 |
| `GET /rsvp/{token}/images/{imageId}` | an image of the event, so the guest page needs no session. 404 once the event is past                                         |

Schemas live in `vyte-contracts` (the account invites in `contracts`, next to `auth`), the OpenAPI document lists every route (`docs.test.ts`).

## 7. Web draft

Built like `angular-base`: SSR, app shell with header and footer, sign-in of the `auth` feature, legal pages. No sign-up page.

| Route                                    | Feature  | Guard        | Content                                                                     |
| ---------------------------------------- | -------- | ------------ | --------------------------------------------------------------------------- |
| `/`                                      | `home`   | –            | What vyte is and sign-in. Signed in: redirect to `/events`                  |
| `/events`                                | `events` | `authGuard`  | Own events, upcoming and past, "Neues Event"                                |
| `/events/new`                            | `events` | `authGuard`  | Form of a new event                                                         |
| `/events/:id`                            | `events` | `authGuard`  | Event details, counts, links to guests and team                             |
| `/events/:id/edit`                       | `events` | `authGuard`  | Form of the event, images                                                   |
| `/events/:id/guests`                     | `guests` | `authGuard`  | Guest list with filter, add one or a list, edit, record answers, links, CSV |
| `/events/:id/team`                       | `team`   | `authGuard`  | Members, invite links and handover (owner), leave (editor)                  |
| `/invite/:token`                         | `invite` | –            | Accept an invite: sign in or create an account right there                  |
| `/rsvp/:token`                           | `rsvp`   | –            | The guest page, without app shell, mobile first                             |
| `/welcome/:token`                        | `auth`   | `guestGuard` | Create an account from an admin link                                        |
| `/admin/users`                           | `admin`  | `adminGuard` | Accounts, open account links, "Konto anlegen"                               |
| `/sign-in`                               | `auth`   | `guestGuard` | from `angular-base`                                                         |
| `/imprint`, `/privacy`, `/accessibility` | `legal`  | –            | from `angular-base`, `SITE_OWNER`                                           |

- `/` is the only page in the sitemap; every other route has `index: false`
- Dates through `localDate`, but in the event's `timeZone`, not the one of the browser (needs an option in `LocalDatePipe`); all-day events show dates only
- Description through `app-ui-rich-text`, editing through `app-form-rich-text`, images through `app-form-files` with `maxFiles` and a list to reorder them
- The gallery on the guest page opens an image large in `app-ui-dialog`
- Guest rows as cards, not a table, as in the admin area of the portfolio
- The CSV comes from the API as a file; the button is a link to the export route, the browser sends the cookie

### Look

Own brand for vyte with light and dark mode. Colors, fonts and the Spartan style are decided before the web app is generated, with `/frontend-design`, and then written down here.

## 8. Security and privacy

- Tokens (guests, editor invites, account links): 32 random bytes from `crypto.randomBytes`, base64url, compared through a unique index. They are stored as they are, because hosts copy guest links again later
- A guest token only reads its event (without guest list) and answers for its own guest; after the event it reveals only the title
- Token pages (`/rsvp/…`, `/invite/…`, `/welcome/…`) send `Referrer-Policy: no-referrer`, so the token does not leak to other sites. The API already sends it through `helmet`
- Rate limits per IP with `createRateLimit()` from `server-core` on every public token route; account creation through a token also counts against the rate limit of sign-up
- Guest page shows names of the hosts only if they set one, never an email
- Names, notes and messages of guests are personal data: a section in the privacy policy, deleted with the event. Hosts are responsible for the data of their guests. The message hint asks for food wishes, so guests may write about allergies: the privacy policy mentions it
- The OpenStreetMap link is a plain link, nothing is loaded from OpenStreetMap until the guest clicks it
- Ownership: every query of a member route filters through `event_members` and the user id
- CSV: cells starting with `=`, `+`, `-` or `@` get a leading `'`, so a spreadsheet does not run them as formulas

## 9. Technical frame

| Item          | Value                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects      | `vyte-web` (`apps/vyte-web`), `vyte-api` (`apps/vyte-api`), `vyte-contracts` (`packages/vyte/contracts`, alias `@vyte/contracts/*`)                                                                                                                                  |
| Tags          | `type:app` / `type:api-app` / `type:contract`, each with `scope:vyte`                                                                                                                                                                                                |
| Libs          | web: `core`, `ui`, `styles`, `contracts`, `vyte-contracts`; API: `server-core`, `server-auth`, `contracts`, `vyte-contracts`                                                                                                                                         |
| Shared change | account links in `server-auth` and `contracts` (table, service, routes, OpenAPI, tests). `db:generate` of every API app and of `server-auth`. Released as a feature of the other API apps too, which only gain the table                                             |
| Config        | `auth.signUpEnabled: false`, own rate limits for the token routes through `extendConfig()`                                                                                                                                                                           |
| Ports         | API 3300, web 4300, so all products run side by side                                                                                                                                                                                                                 |
| Database      | `vyte_api` (entry in `tools/postgres/init-databases.sql`), tests `vyte_api_test`                                                                                                                                                                                     |
| Release       | tags `nx1-vyte-web-v*` and `nx1-vyte-api-v*`, images `ghcr.io/<owner>/nx1-vyte-*`, publish jobs in `ci.yml`                                                                                                                                                          |
| Commit scopes | `vyte-web`, `vyte-api`, `vyte-contracts` in `commitlint.config.mjs`                                                                                                                                                                                                  |
| Images        | API image as user `node` with an uploads folder owned by uid 1000, like `portfolio-api`                                                                                                                                                                              |
| Docs          | `docs/apps/vyte-web.md`, `docs/apps/vyte-api.md`, `docs/libs/vyte-contracts.md`, this spec, entries in `docs/README.md` and `docs/workspace.md`, scope `scope:vyte` in `CLAUDE.md`, account links in `docs/libs/server-auth.md` and `docs/backend/authentication.md` |

Reference projects: `express-api-base` for the API with auth and images, `angular-base` for the web app with auth, legal pages and app shell, `portfolio-web` for the admin user list, `dartomat-*` for a product with its own contracts lib and `/api/v1`.

## 10. Decisions

| Question             | Decision                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation of guests | one personal link per guest, no account                                                                                                     |
| Collaboration        | invite link of the owner, role editor; owner keeps deleting and the team                                                                    |
| Sending links        | copy or share, no email                                                                                                                     |
| Companions           | a number only, no names                                                                                                                     |
| Couples and families | one guest with an allowance, one answer                                                                                                     |
| Adding guests        | one by one or as a pasted list                                                                                                              |
| Answers by hosts     | allowed, marked "vom Host eingetragen"                                                                                                      |
| Questions to guests  | only the message, with a hint about food wishes                                                                                             |
| All-day events       | switch `allDay`, dates only                                                                                                                 |
| Location             | text plus a link to OpenStreetMap, no embedded map                                                                                          |
| Images               | up to 6, ordered, the first is the cover, the rest a gallery                                                                                |
| After the event      | archive, read-only, guest links say it is over, nothing deleted automatically                                                               |
| Ownership            | the owner can hand the event to an editor                                                                                                   |
| Sign-up              | closed; admin creates an account by name and shares a link, the person sets email and password. An editor invite can also create an account |
| Export               | CSV in v1                                                                                                                                   |
| Look                 | own brand, decided with `/frontend-design` before the web app                                                                               |

## 11. Open questions

1. **Look**: colors, fonts and Spartan style (see 7)
2. **Account links**: is 7 days right, and should an admin also be able to renew a link?
3. **Share text**: the text that goes with a shared guest link, e.g. "Du bist eingeladen: <Titel> am <Datum>"
4. **Domain**: where vyte runs, for `siteUrl`, `cors.origins` and the stacks in the server setup
