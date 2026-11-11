# vyte: specification

Status: **draft**, still being refined. The API has started: [apps/vyte-api](../../apps/vyte-api) holds the accounts, the admin, the events, the guest list, the guest links, the team (members, hand-over, editor invites), the save the date and the guest photos, see [vyte-api](../apps/vyte-api.md). The web app is not built yet, [apps/vyte-web](../../apps/vyte-web) only holds a README.

## 1. Overview

vyte plans an event and keeps its guest list. The host creates an event, adds the guests and sends each of them a personal link. The guest opens the link, sees the event and accepts or declines, saying how many companions they bring. The host can invite other people to work on the list with them. Before the invitations go out, a save-the-date link announces the date. On the day itself, guests upload their own photos through a QR code on their place card or on a stand.

### Goals of v1

- Create, edit and delete events with title, description, up to six images, location, start and end, also all-day
- Keep a guest list per event, with an allowance of companions per guest (none, plus one, more). Add guests one by one or as a pasted list
- One personal link per guest; guests need no account
- Hosts see who accepted, declined or has not answered yet, and how many people come. They can record an answer a guest gave in person and export the list as CSV
- Work on an event together: the owner invites editors through a link and can hand the event over
- Closed sign-up: an admin creates an account by name and shares a link, the person sets email and password there
- Past events move to an archive, guest links then only say that the event is over
- A save-the-date link per event, shared before the guest list is ready
- Guests upload their own photos, 6 per guest by default (config): through a QR code on a printed place card, or through a shared QR code on a stand when there are no fixed seats
- German and English, mobile first, accessible (WCAG AA)

### Not in v1

- Sending emails or messages: links are copied or shared through the share sheet of the device
- Open sign-up, public event pages or a shared sign-up link for an event
- Names of companions, households with one answer per person, own questions per event (diet, allergies): the message of the guest covers it
- Embedded maps
- Payments, tickets, seating plans, check-in at the door
- Guests seeing each other or the photos of others
- Reminders and notifications

## 2. Roles

| Role    | Who                                                                  | Account |
| ------- | -------------------------------------------------------------------- | ------- |
| Admin   | Role `admin` of `server-auth`, creates accounts                      | yes     |
| Owner   | Created the event or took it over, exactly one per event             | yes     |
| Editor  | Joined through an invite link of the owner                           | yes     |
| Guest   | Is on the guest list, has a personal link and a photo link           | no      |
| Visitor | Has the save-the-date link or scans the photo stand, unknown to vyte | no      |

Accounts are the shared accounts of `server-auth`. Sign-up is off (`auth.signUpEnabled: false`), accounts come from an account link of an admin (section 4) or from an editor invite. The admin role has no rights on events it is not a member of.

| Action                                                     | Owner | Editor |                  Guest (own link)                  |
| ---------------------------------------------------------- | :---: | :----: | :------------------------------------------------: |
| See the event and the guest list                           |   ✓   |   ✓    |                event only, no list                 |
| Edit the event and its images                              |   ✓   |   ✓    |                         –                          |
| Add, edit, remove guests; renew a guest link               |   ✓   |   ✓    |                         –                          |
| See all answers and counts; export CSV                     |   ✓   |   ✓    |                  own answer only                   |
| Answer: accept or decline, companions, message             |   –   |   –    |                ✓ until the deadline                |
| Record an answer for a guest                               |   ✓   |   ✓    |                         –                          |
| Save the date and photo stand: turn on or off, renew links |   ✓   |   ✓    |                         –                          |
| Print place cards and the stand                            |   ✓   |   ✓    |                         –                          |
| Upload photos up to the limit, delete own                  |   –   |   –    | upload in the upload window, delete own also after |
| See, hide and delete all photos; download them as ZIP      |   ✓   |   ✓    |                  own photos only                   |
| Create or revoke invite links for editors                  |   ✓   |   –    |                         –                          |
| Remove an editor; hand the event to an editor              |   ✓   |   –    |                         –                          |
| Leave the event                                            |   –   |   ✓    |                         –                          |
| Delete the event                                           |   ✓   |   –    |                         –                          |

A past event is read-only for everyone: hosts can still read it, export the list, manage the photos and delete it (owner). An editor can still leave it. Photos can be uploaded until the upload window closes. The one exception is the save the date: its link can still be turned off after the event, so a link that went somewhere unwanted can be stopped.

## 3. Domain model

Limits become constants in `vyte-contracts` (like `notes-limits`).

| Limit                 | Value                                       |
| --------------------- | ------------------------------------------- |
| Guests per event      | 500                                         |
| Names per pasted list | 100                                         |
| Editors per event     | 10 (also the open editor invites at a time) |
| Images per event      | 6                                           |
| Companions per guest  | 10                                          |
| Events per user       | none in v1                                  |

The photo limits are config of `vyte-api`, not constants, so they change without a release. The API sends the limit and what is left with every answer of a photo route, the web app never hardcodes them. Each key has a default, so a config without them stays valid. The upload rate limit (`rateLimit.uploadWindowMinutes`, default 15, and `rateLimit.uploadMaxRequests`, default 200, per client IP) is described in section 8.

| Config key                  | Default | Meaning                                                                                                               |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `photos.maxPerGuest`        | 6       | photos per guest through their photo link                                                                             |
| `photos.maxPerDevice`       | 6       | photos per device through the photo stand                                                                             |
| `photos.maxPerEvent`        | 1000    | all photos of an event, at most 65 535 (a ZIP without ZIP64 holds that many), a cap against abuse                     |
| `photos.maxPerStand`        | 500     | photos through the photo stand in all, so one stand link cannot fill the event                                        |
| `photos.uploadDaysAfterEnd` | 7       | days after the end of the event until uploads close                                                                   |
| `photos.maxImageWidth`      | 2560    | width and height photos are scaled down to, aspect ratio kept, larger than the event images (`uploads.maxImageWidth`) |

### Event

| Field                    | Type              | Rules                                                                                                                                                                              |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | uuid              |                                                                                                                                                                                    |
| `title`                  | text              | required, 1–120 characters                                                                                                                                                         |
| `description`            | rich text (HTML)  | optional, at most 20 000 characters of HTML, formats of `RICH_TEXT_TAGS` (`@contracts/rich-text`), sanitized by the API                                                            |
| `locationName`           | text              | optional, at most 200 characters, e.g. "Gartenhaus"                                                                                                                                |
| `address`                | text              | optional, at most 500 characters, line breaks allowed. When set, the pages show a link "In Karte öffnen" to OpenStreetMap (`https://www.openstreetmap.org/search?query=<address>`) |
| `allDay`                 | boolean           | default `false`                                                                                                                                                                    |
| `startsAt`               | timestamp with tz | required. All-day: midnight of the first day in `timeZone`; the API uses only its local day                                                                                        |
| `endsAt`                 | timestamp with tz | optional, not before `startsAt`. All-day: midnight of the last day, the event lasts until the end of that day                                                                      |
| `timeZone`               | IANA name         | required, from the browser of the creator, e.g. `Europe/Berlin`. Times are shown in it for everyone                                                                                |
| `rsvpDeadline`           | timestamp with tz | optional, not after `startsAt`. Without one, answers are open until `startsAt`                                                                                                     |
| `saveTheDateToken`       | text or null      | 32 random bytes, base64url. `null` = save the date is off. Renewing it replaces it                                                                                                 |
| `saveTheDateNote`        | text              | optional, at most 500 characters, plain text on the save-the-date page, e.g. "Einladung folgt im Frühjahr"                                                                         |
| `photoStandToken`        | text or null      | 32 random bytes, base64url. `null` = the photo stand is off. Renewing it replaces it. The API answers it as `photoStand: { token }`, or `null`                                     |
| `createdAt`, `updatedAt` | timestamp         |                                                                                                                                                                                    |

**Past**: an event is past after `endsAt`, without `endsAt` at the end of the day of `startsAt` (both in `timeZone`). Nothing is stored for it, the API computes it.

**Upload window**: photos can be uploaded from `startsAt` until `photos.uploadDaysAfterEnd` days after the event is past. Also computed, not stored.

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

### EditorInvite

| Field              | Type            | Rules                                                                                           |
| ------------------ | --------------- | ----------------------------------------------------------------------------------------------- |
| `id`               | uuid            |                                                                                                 |
| `eventId`          | uuid            | deleted with the event                                                                          |
| `token`            | text            | 32 random bytes, base64url, unique                                                              |
| `createdBy`        | uuid            | the owner                                                                                       |
| `expiresAt`        | timestamp       | 7 days after creation                                                                           |
| `usedAt`, `usedBy` | timestamp, uuid | set when accepted or when the account is created through it; a used invite cannot be used again |

The owner can revoke an open invite (delete it); a used one stays as the record of who joined through it. At most 10 invites are open at a time. Every unknown, used, expired or revoked link, and one to a past event, answers 404 with the same body on the public endpoints, so a guessed token reveals nothing.

### Guest

| Field                    | Type                                    | Rules                                                                                                                                           |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | uuid                                    |                                                                                                                                                 |
| `eventId`                | uuid                                    | deleted with the event                                                                                                                          |
| `name`                   | text                                    | required, 1–100 characters, as the host writes it ("Familie Weber")                                                                             |
| `note`                   | text                                    | optional, at most 500 characters, only for hosts                                                                                                |
| `maxCompanions`          | integer                                 | 0–10. 0 = comes alone, 1 = plus one, more for couples and families                                                                              |
| `token`                  | text                                    | 32 random bytes, base64url, unique. Renewing it replaces it                                                                                     |
| `photoToken`             | text                                    | 32 random bytes, base64url, unique. Separate from `token`, so a place card on the table only allows uploading photos, never changing the answer |
| `response`               | `'pending' \| 'accepted' \| 'declined'` | starts as `pending`                                                                                                                             |
| `companions`             | integer                                 | 0–`maxCompanions`, only meaningful when accepted, 0 otherwise                                                                                   |
| `companionsReduced`      | boolean                                 | `true` when lowering `maxCompanions` cut `companions`; cleared by the next answer, of the host or of the guest. Default `false`                 |
| `message`                | text                                    | optional, at most 500 characters, written by the guest                                                                                          |
| `answeredBy`             | `'guest' \| 'host'` or null             | who gave the last answer; `host` shows "vom Host eingetragen" in the list                                                                       |
| `respondedAt`            | timestamp                               | time of the last answer                                                                                                                         |
| `createdAt`, `updatedAt` | timestamp                               |                                                                                                                                                 |

A couple or family is one guest with an allowance ("Familie Weber", +3): one link, one answer for all. Lowering `maxCompanions` below the companions already given lowers `companions` to the new maximum; the list marks the guest so the hosts can tell them.

### EventPhoto

| Field                         | Type                 | Rules                                                                                                                |
| ----------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                          | uuid                 |                                                                                                                      |
| `eventId`                     | uuid                 | deleted with the event, the files go too                                                                             |
| `source`                      | `'guest' \| 'stand'` | through a photo link or through the photo stand                                                                      |
| `guestId`                     | uuid or null         | the guest of the photo link; set null when the guest is removed, the photo stays                                     |
| `deviceId`                    | text or null         | the id of the device cookie `vyte_stand_device` of the photo stand (section 8)                                       |
| `uploaderName`                | text or null         | the guest's name at upload time, or the name a stand visitor typed (optional, at most 60 characters); `null` if none |
| `filename`, `width`, `height` | text, integer        | WebP from `processImage()`, bounded to `photos.maxImageWidth` on both sides, metadata such as GPS dropped            |
| `hidden`                      | boolean              | default `false`; hosts hide a photo without deleting it                                                              |
| `createdAt`                   | timestamp            |                                                                                                                      |

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
3. Each guest card has "Link kopieren" and, where the device offers it, "Teilen" (Web Share API with the link and a short text, e.g. "Du bist eingeladen: <Titel> am <Datum>". The final wording comes with the design, this example applies until then)
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

### Save the date (`/save-the-date/:token`)

1. On the event page hosts turn on save the date and copy or share its link, e.g. into a group chat. It works without a guest list
2. Visitors see cover image, title, date (time only if not all-day), `locationName` (not the address), `saveTheDateNote` and "Einladung folgt"
3. "Zum Kalender hinzufügen" downloads an `.ics` file. The guest page offers the same with the full address
4. The link keeps working after the invitations went out. It shows "Nicht gefunden" (404) when the host turns it off or renews it, and "Das Event ist vorbei" once the event is past

### Photos

Two ways in, both optional, both only during the upload window:

- **Place cards**: for events with fixed seats. `/events/:id/print` prints a folding card per guest with name and a QR code of their photo link (`/photos/:token`). Hosts choose all guests or only those who accepted. Several cards per A4 page, to cut and fold
- **Photo stand**: for events without fixed seats. Hosts turn on the stand, `/events/:id/print` prints an A5 card with a QR code of `/stand/:token` for tables or the entrance

The upload page:

1. Shows the event title, "Deine Fotos" and how many are left
2. Through a place card it greets the guest by name. On the stand, visitors may type a name (optional) so the hosts know who took the photos
3. On the stand, the page first asks the API once for the device id (`POST /stand/{token}/device`, which sets the device cookie). Without it an upload answers 409
4. One or more photos at once, from the camera or the gallery, up to the limit. Each upload shows progress; a failed photo can be retried
5. Visitors see and delete their own photos: by photo link the ones of that guest, on the stand the ones of this device
6. Before the window opens: "Ab <Datum> kannst du hier Fotos hochladen". After it closes: "Der Upload ist beendet"
7. A hint says that the hosts see the photos and that people on them should agree

Hosts can renew a photo link, the one of a place card or the one of the stand, also after the event, as long as uploads are open. The old link answers 404 from then on, so a card or a link that went around can be stopped. Once the window has closed, links cannot be renewed any more.

For hosts, `/events/:id/photos` shows all photos as a grid with the name of the uploader, newest first. They open a photo large, hide or show it, delete it, and download all visible photos as a ZIP. The count of photos comes from that list; the event itself carries no photo count.

### Collaborators

1. On the team page the owner creates an invite link and copies or shares it
2. The invited person opens `/invite/:token`. The page says who invites them to which event
3. Signed in: "Einladung annehmen" makes them an editor and opens the event. A member opening the link just gets the event, and the link stays open for the person it was meant for. The editor who used the link lands on the event again, as long as they are a member
4. Signed out: two ways. "Anmelden" leads to sign-in with `returnUrl` back to the invite. "Konto erstellen" asks for email and password, and optionally a name, right on the page, creates the account, signs in and makes them an editor. The editor invite is the only way besides the admin link to get an account
5. The owner sees editors and open invites, removes editors and revokes open invites
6. The owner hands the event to an editor after a confirmation, while the event is upcoming: that editor becomes owner, the old owner becomes editor
7. An editor can leave an event, also after it is over; it then disappears from their list

### Past events

- `/events` shows "Kommend" and "Vergangen"
- A past event opens read-only: no editing, no guest changes, no invites. Hosts can export the list and the owner can delete the event. An editor can still leave. Photos stay manageable, uploads run until the window closes. The save the date can be turned off, but not turned on or renewed
- Nothing is deleted automatically

### Deleting an account

`vyte-api` registers an `onUserDeleted()` hook. It runs in the transaction that deletes the account: it locks every event the user is a member of and deletes the events the user owns, with their guests, members and invites. Their images are removed after the commit. Memberships as editor go with the cascade. If the hook fails, the deletion is rolled back and the account stays. The account page tells an owner to hand over events first.

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

Routes under `/api/v1` like `dartomat-api`, `/health` and `/docs` at the root. Answers wrapped in an object, errors in the usual format `{ error: { message, details? } }`. An event the user is not a member of answers with 404, a lacking role (editor wants to delete) with 403, a write to a past event with 409. Exceptions that only take something away stay open after the event: deleting the event, an editor leaving, turning the save-the-date link or the photo stand off, deleting a photo. Renewing a photo link is allowed while uploads are open.

### Accounts (`server-auth`)

| Method and path                      | Who    | Content                                                                                                                                                  |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/account-invites`         | admin  | `{ invites }`: open account links                                                                                                                        |
| `POST /admin/account-invites`        | admin  | `{ name }`, `{ invite }` with token and expiry                                                                                                           |
| `DELETE /admin/account-invites/{id}` | admin  | 204                                                                                                                                                      |
| `GET /auth/account-invites/{token}`  | public | `{ invite }`: the name                                                                                                                                   |
| `POST /auth/account-invites/{token}` | public | `{ email, password, name? }` (without a name the account takes the one of the link), creates the account and signs in, `{ user }`. 409 for a taken email |

Creating the account reuses `hashPassword()`, `insertUser()` and `startSession()` of `server-auth`: the password is hashed first, then the user is inserted and the link marked used in one transaction with the link locked. Both ignore `auth.signUpEnabled`.

### Events (session required)

| Method and path                        | Who           | Content                                                            |
| -------------------------------------- | ------------- | ------------------------------------------------------------------ |
| `GET /events`                          | member        | `{ events }`: own events with role, counts, cover image and `past` |
| `POST /events`                         | signed in     | creates an event, the caller becomes owner, `{ event }`            |
| `GET /events/{id}`                     | member        | `{ event }` with role, counts, images and `past`                   |
| `PATCH /events/{id}`                   | owner, editor | changes fields, `{ event }`                                        |
| `DELETE /events/{id}`                  | owner         | 204, also for a past event                                         |
| `POST /events/{id}/images`             | owner, editor | `FormData` with files, appended up to 6 (409 beyond), `{ images }` |
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

| Method and path                          | Who                        | Content                                                                                                                                                |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /events/{id}/members`               | member                     | `{ members }`: `userId`, name, email, role, `joinedAt`; owner first, then by join time                                                                 |
| `DELETE /events/{id}/members/{userId}`   | owner; editor for themself | removes an editor or leaves; the owner cannot be removed (409). Leaving works after the event, removing an editor does not (409)                       |
| `PUT /events/{id}/owner`                 | owner                      | `{ userId }` of an editor, swaps the roles, `{ members }`; upcoming events only (409 on a past one)                                                    |
| `GET /events/{id}/invites`               | owner                      | `{ invites }`: open invites                                                                                                                            |
| `POST /events/{id}/invites`              | owner                      | `{ invite }` with token and expiry; at most 10 open invites (409 beyond)                                                                               |
| `DELETE /events/{id}/invites/{inviteId}` | owner                      | 204                                                                                                                                                    |
| `GET /invites/{token}`                   | public                     | `{ invite }`: event title, start, `allDay`, `timeZone`, name of the owner if set                                                                       |
| `POST /invites/{token}/accept`           | signed in                  | becomes editor and uses the link, `{ event }`. A member gets the event and the link stays open. 409 at 10 editors                                      |
| `POST /invites/{token}/sign-up`          | public                     | `{ email, password, name? }`, 201 with `{ event }`: creates the account, signs in, makes an editor. A taken email answers 409 and leaves the link open |

### RSVP (public, `PUT` rate limited per IP)

| Method and path                      | Content                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /rsvp/{token}`                  | `{ invitation }`: the event without guest list, the own guest, whether answers are open, `past`. A past event without details |
| `PUT /rsvp/{token}`                  | `{ response, companions, message }`, `{ invitation }`. 409 after the deadline, or after the start without one (section 3)     |
| `GET /rsvp/{token}/images/{imageId}` | an image of the event, so the guest page needs no session. 404 once the event is past                                         |

`GET /rsvp/{token}/calendar` answers with the `.ics` file of the event, with the full address. 404 once the event is past.

### Save the date and photo stand (session required, owner or editor)

| Method and path                                  | Content                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `PUT /events/{id}/save-the-date`                 | `{ note }`, turns it on (creates a token if there is none) or changes the note, `{ event }`; 409 once the event is past |
| `DELETE /events/{id}/save-the-date`              | turns it off and removes the note, `{ event }`; also after the event, so a leaked link can still be stopped             |
| `POST /events/{id}/save-the-date/token`          | new token, `{ event }`; 404 while it is off, 409 once the event is past                                                 |
| `PUT /events/{id}/photo-stand`                   | turns it on and creates its link once, `{ event }`; 409 once the event is past                                          |
| `DELETE /events/{id}/photo-stand`                | turns it off, `{ event }`; also after the event, the photos stay                                                        |
| `POST /events/{id}/photo-stand/token`            | new link, `{ event }`; the old one answers 404; 404 while it is off, 409 once the upload window has closed              |
| `POST /events/{id}/guests/{guestId}/photo-token` | new photo link, `{ guest }`; the old one answers 404, 409 once the upload window has closed                             |

### Photos for hosts (session required, owner or editor)

| Method and path                        | Content                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /events/{id}/photos`              | `{ photos }` with uploader and `hidden`, newest first                               |
| `GET /events/{id}/photos/{photoId}`    | the WebP file                                                                       |
| `PATCH /events/{id}/photos/{photoId}`  | `{ hidden }`, `{ photo }`                                                           |
| `DELETE /events/{id}/photos/{photoId}` | 204                                                                                 |
| `GET /events/{id}/photos/archive`      | a ZIP of all visible photos, streamed, named `<uploader>-<n>.webp`; 409 above 4 GiB |

### Save the date and uploads (public, only writes rate limited per IP)

| Method and path                                                   | Content                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /save-the-date/{token}`                                      | `{ saveTheDate }`: title, date, `allDay`, `timeZone`, `locationName`, note, cover size, `past`; once the event is past only `past` and the title. Not rate limited |
| `GET /save-the-date/{token}/calendar`                             | the `.ics` file, location without address; 404 once the event is past. Not rate limited                                                                            |
| `GET /save-the-date/{token}/cover`                                | the cover image; 404 without one or once the event is past. Not rate limited                                                                                       |
| `GET /photos/{token}`                                             | `{ upload }`: event title, guest name, own photos, limit, left, window open or not and its times                                                                   |
| `POST /photos/{token}`                                            | `FormData` with one file in `photo`, `{ upload }`, 201. 409 outside the window, when the guest has the limit or the event is full                                  |
| `GET /photos/{token}/{photoId}`                                   | an own photo                                                                                                                                                       |
| `DELETE /photos/{token}/{photoId}`                                | deletes an own photo, `{ upload }`; also outside the window                                                                                                        |
| `GET /stand/{token}`                                              | `{ upload }` like above, for the photos of this device                                                                                                             |
| `POST /stand/{token}/device`                                      | 204; sets the device cookie `vyte_stand_device` if the device has none. Once before the first upload, rate limited                                                 |
| `POST /stand/{token}`                                             | `FormData` with one file in `photo` and an optional `name` (at most 60 characters). 409 without the device cookie, `{ upload }`, 201                               |
| `GET /stand/{token}/{photoId}`, `DELETE /stand/{token}/{photoId}` | own photo of this device; the delete also outside the window                                                                                                       |

Schemas live in `vyte-contracts` (the account invites in `contracts`, next to `auth`), the OpenAPI document lists every route (`docs.test.ts`).

## 7. Web draft

Built like `angular-base`: SSR, app shell with header and footer, sign-in of the `auth` feature, legal pages. No sign-up page.

| Route                                    | Feature         | Guard        | Content                                                                     |
| ---------------------------------------- | --------------- | ------------ | --------------------------------------------------------------------------- |
| `/`                                      | `home`          | –            | What vyte is and sign-in. Signed in: redirect to `/events`                  |
| `/events`                                | `events`        | `authGuard`  | Own events, upcoming and past, "Neues Event"                                |
| `/events/new`                            | `events`        | `authGuard`  | Form of a new event                                                         |
| `/events/:id`                            | `events`        | `authGuard`  | Event details, counts, links to guests and team                             |
| `/events/:id/edit`                       | `events`        | `authGuard`  | Form of the event, images                                                   |
| `/events/:id/guests`                     | `guests`        | `authGuard`  | Guest list with filter, add one or a list, edit, record answers, links, CSV |
| `/events/:id/team`                       | `team`          | `authGuard`  | Members, invite links and handover (owner), leave (editor)                  |
| `/events/:id/photos`                     | `photos`        | `authGuard`  | All photos, hide, delete, ZIP download                                      |
| `/events/:id/print`                      | `print`         | `authGuard`  | Place cards and the stand card, print layout without app shell              |
| `/invite/:token`                         | `invite`        | –            | Accept an invite: sign in or create an account right there                  |
| `/rsvp/:token`                           | `rsvp`          | –            | The guest page, without app shell, mobile first                             |
| `/save-the-date/:token`                  | `save-the-date` | –            | Save the date, without app shell                                            |
| `/photos/:token`                         | `upload`        | –            | Upload page of a guest (place card)                                         |
| `/stand/:token`                          | `upload`        | –            | Upload page of the photo stand                                              |
| `/welcome/:token`                        | `auth`          | `guestGuard` | Create an account from an admin link                                        |
| `/admin/users`                           | `admin`         | `adminGuard` | Accounts, open account links, "Konto anlegen"                               |
| `/sign-in`                               | `auth`          | `guestGuard` | from `angular-base`                                                         |
| `/imprint`, `/privacy`, `/accessibility` | `legal`         | –            | from `angular-base`, `SITE_OWNER`                                           |

- `/` is the only page in the sitemap; every other route has `index: false`
- Dates through `localDate`, but in the event's `timeZone`, not the one of the browser (needs an option in `LocalDatePipe`); all-day events show dates only
- Description through `app-ui-rich-text`, editing through `app-form-rich-text`, images through `app-form-files` with `maxFiles` and a list to reorder them
- The gallery on the guest page opens an image large in `app-ui-dialog`
- Guest rows as cards, not a table, as in the admin area of the portfolio
- The CSV comes from the API as a file; the button is a link to the export route, the browser sends the cookie
- QR codes through a new wrapper `UiQrCode` (`app-ui-qr-code`) in the lib `ui`, rendered as SVG so it prints sharp and works in SSR. The QR library is imported only there, like Spartan
- Printing through print CSS (`@media print`, `@page`), no PDF on the server. The page shows a preview and "Drucken" calls `window.print()`
- The photo input accepts JPEG, PNG, WebP and AVIF, not HEIC: iOS then hands over a JPEG. To check on a real iPhone
- Uploads go one file per request, so progress shows per photo and one failure does not lose the others

### Look

Direction **Konfetti**: bright, cheerful and clear, a little playful but not loud. The designs of the guest pages live on the canvas [vyte Design](https://claude.ai/artifact/L45ESAH65DizNnJ1cuw2Bg) (private): invitation, answer sent, event over, save the date, photo upload by place card and by stand. A snapshot with previews that open in the browser is in [design/](design/README.md).

| Token       | Value     | Use                                                       |
| ----------- | --------- | --------------------------------------------------------- |
| `--brand`   | `#FFE45C` | ground of the guest pages                                 |
| ink         | `#1A1A2E` | text, borders, offset shadows                             |
| surface     | `#FFFFFF` | cards, inputs, chips                                      |
| `--primary` | `#1F3BD6` | primary buttons, selected answer, links; white text on it |
| decor       | `#FF5A3C` | decorative shapes only, never behind text                 |
| soft        | `#FFF6C7` | hints and the quoted message of a guest                   |
| muted text  | `#55546A` | secondary text on white                                   |

- **Fonts**: Unbounded (600, 800) for headings, numbers and primary buttons; DM Sans (400, 500, 700) for text. Self-hosted in `base/_fonts.scss` of the app, not loaded from Google, so no request leaves the site
- **Shapes**: cards with a 3 px ink border, radius 28 px and an offset shadow of 3 px without blur; controls with radius 16 px, primary buttons with a 2 px shadow; date, time and place as pill chips
- **Images**: the cover image as a photo with a white frame, tilted by 1°
- **Decor**: at most two flat shapes per screen (a circle, a half circle) behind the content, `aria-hidden`
- **Contrast**: every pair above reaches at least 4.5:1, links in `#1F3BD6` also on the yellow ground

## 8. Security and privacy

- Tokens (guests, photo links, save the date, photo stand, editor invites, account links): 32 random bytes from `crypto.randomBytes`, base64url, compared through a unique index. They are stored as they are, because hosts copy guest links again later
- A guest token only reads its event (without guest list) and answers for its own guest; after the event it reveals only the title
- Token pages (`/rsvp/…`, `/photos/…`, `/stand/…`, `/save-the-date/…`, `/invite/…`, `/welcome/…`) send `Referrer-Policy: no-referrer`, so the token does not leak to other sites. The API already sends it through `helmet`
- Rate limits per IP with `createRateLimit()` from `server-core` on every public token route that writes (answers, uploads, deleting an own photo, the device call of the stand, accepting an invite or account link). Uploads share their own limit, `rateLimit.uploadWindowMinutes` and `rateLimit.uploadMaxRequests`; account creation through a token also counts against the rate limit of sign-up. Reading a token (`GET`) has no per-IP limit: the web app renders those pages on the server, so every guest would arrive from the server's IP. A token of 32 random bytes cannot be guessed, and every unknown token answers the same 404
- Answers that carry a live token send `Cache-Control: no-store`: event answers (with the save-the-date and photo stand link), guest lists, invites, guest link answers, the calendar files, the upload pages and the ZIP. The event images are `private, immutable`, the guest and save-the-date images and the photos `private, no-cache`, so a renewed link or the end of the event takes effect at once
- Guest page shows names of the hosts only if they set one, never an email
- Names, notes and messages of guests are personal data: a section in the privacy policy, deleted with the event. Hosts are responsible for the data of their guests. The message hint asks for food wishes, so guests may write about allergies: the privacy policy mentions it
- The OpenStreetMap link is a plain link, nothing is loaded from OpenStreetMap until the guest clicks it
- Ownership: every query of a member route filters through `event_members` and the user id
- CSV: cells starting with `=`, `+`, `-` or `@` get a leading `'`, so a spreadsheet does not run them as formulas
- A photo link only uploads and shows the photos of its guest. The place card lies open on the table, so it must not reveal the answer, the message or other guests
- The save-the-date link may travel through group chats: it shows `locationName` only, no address, no guest names
- Photo stand: the device cookie is a random id, set once by `POST /stand/{token}/device`, http-only, `SameSite=Lax`, path `/api/v1/stand`, 30 days, `Secure` where the session cookie is. It is needed for the upload limit and to show own photos, so it is strictly necessary and needs no consent banner. Clearing it gets a new allowance, which `photos.maxPerEvent` and the rate limit cap
- Photos show people: they are personal data, a section in the privacy policy, deleted with the event. `processImage()` drops EXIF and GPS. Hidden photos are not in the ZIP
- Storage: 1000 photos of about 0.5 MB as WebP make about 500 MB per event at most, on `/mnt/data/vyte-api`

## 9. Technical frame

| Item                  | Value                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects              | `vyte-web` (`apps/vyte-web`), `vyte-api` (`apps/vyte-api`), `vyte-contracts` (`packages/vyte/contracts`, alias `@vyte/contracts/*`)                                                                                                                                                                                          |
| Tags                  | `type:app` / `type:api-app` / `type:contract`, each with `scope:vyte`                                                                                                                                                                                                                                                        |
| Libs                  | web: `core`, `ui`, `styles`, `contracts`, `vyte-contracts`; API: `server-core`, `server-auth`, `contracts`, `vyte-contracts`                                                                                                                                                                                                 |
| Shared change         | account links in `server-auth` and `contracts` (table, service, routes, OpenAPI, tests). `db:generate` of every API app and of `server-auth`. Released as a feature of the other API apps too, which only gain the table                                                                                                     |
| Config                | `auth.signUpEnabled: false`, `photos.*` (section 3) and own rate limits for the token routes through `extendConfig()`                                                                                                                                                                                                        |
| Shared change, images | `processImage()` of `server-core` gets an optional maximum width and height, the photos use `photos.maxImageWidth` on both sides                                                                                                                                                                                             |
| Shared change, QR     | `UiQrCode` in `ui` with a QR library (e.g. `qrcode`), entry on the showcase page                                                                                                                                                                                                                                             |
| Dependencies          | none for the photos: no ZIP library. The archive is written by `apps/vyte-api/src/shared/zip.ts` (store-only, CRC-32 from `node:zlib`, no ZIP64), so `package.json` gets no new package                                                                                                                                      |
| Ports                 | API 3300, web 4300, so all products run side by side                                                                                                                                                                                                                                                                         |
| Domain                | <https://vyte.manuel-braun.net> for web and API. Traefik sends `/api/` and `/health` to `vyte-api`, everything else to `vyte-web`, like `dartomat`. `apiBaseUrl` is `https://vyte.manuel-braun.net/api/v1`, `siteUrl` and `cors.origins` the site itself. Web and API share one origin, so the session cookie is first-party |
| Stacks                | `stacks/vyte-web` and `stacks/vyte-api` in the server setup, data under `/mnt/data/vyte-api` with the uploads owned by uid 1000                                                                                                                                                                                              |
| Database              | `vyte_api` (entry in `tools/postgres/init-databases.sql`), tests `vyte_api_test`                                                                                                                                                                                                                                             |
| Release               | tags `nx1-vyte-web-v*` and `nx1-vyte-api-v*`, images `ghcr.io/<owner>/nx1-vyte-*`, publish jobs in `ci.yml`                                                                                                                                                                                                                  |
| Commit scopes         | `vyte-web`, `vyte-api`, `vyte-contracts` in `commitlint.config.mjs`                                                                                                                                                                                                                                                          |
| Images                | API image as user `node` with an uploads folder owned by uid 1000, like `portfolio-api`                                                                                                                                                                                                                                      |
| Docs                  | `docs/apps/vyte-web.md`, `docs/apps/vyte-api.md`, `docs/libs/vyte-contracts.md`, this spec, entries in `docs/README.md` and `docs/workspace.md`, scope `scope:vyte` in `CLAUDE.md`, account links in `docs/libs/server-auth.md` and `docs/backend/authentication.md`                                                         |

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
| Save the date        | one link per event, no names, can be turned off and renewed                                                                                 |
| Guest photos         | optional, 6 per guest by default, config of the API                                                                                         |
| Place card QR        | its own photo link per guest, separate from the invitation link                                                                             |
| Without fixed seats  | a photo stand with one shared QR code, anonymous with an optional name, 6 per device                                                        |
| Who sees photos      | hosts all of them, a guest or device only its own                                                                                           |
| Look                 | Konfetti: yellow ground, ink borders, blue primary, Unbounded and DM Sans (see 7)                                                           |
| Account links        | valid 7 days, no renewing: the admin revokes a link and creates a new one                                                                   |
| Share text           | comes with the design, until then "Du bist eingeladen: <Titel> am <Datum>"                                                                  |
| Domain               | `vyte.manuel-braun.net` for web and API, the API under `/api/`                                                                              |

## 11. Open questions

1. **Host pages**: event list, event page, guest list, team, photos and the print layouts are not designed yet. Same Konfetti look, but calmer for working with lists?
2. **Dark mode**: the guest pages are light. Do the host pages get a dark variant, and how does Konfetti look in it?
3. **Spartan style**: Konfetti changes borders, radii and shadows a lot. A new helm lib for vyte, or `helm-vega` with the vyte tokens?
