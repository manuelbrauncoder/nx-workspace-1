---
name: api-security
description: Security checklist for the Express API apps of this workspace, vyte first. Use when building or reviewing routes, auth and roles, token links, uploads, cookies, rate limits or exports of an API app (apps/*-api, packages/server/*).
---

# API security checklist

Rules for the API apps (`apps/*-api`, `packages/server/*`). They add to the conventions in `CLAUDE.md` (section "API-Apps") and to section 8 of `docs/vyte/spec.md`. Each rule names the helper or file that implements it. When building, follow them; when reviewing, check each one and say which file breaks it.

## Access (OWASP API1, API5)

- Every route that needs a session has `requireAuth` (`@server/auth/auth.middleware`) and reads the user only through `currentUserId(req)`
- Every query of a member route filters by the user: in vyte through `event_members` joined on `currentUserId(req)`, never by the event id alone
- A resource of someone else is **404**, a member without the role (editor wants to delete) is **403**. Never 403 for "exists but not yours"
- The `admin` role of `server-auth` has no rights on events it is not a member of
- Role checks happen in the service, in the same query or transaction as the write, not only in the router

## Token links

- Tokens are 32 bytes from `crypto.randomBytes`, base64url, stored with a unique index. Never `Math.random`, never a uuid as a secret
- Unknown, renewed, used, expired and revoked tokens all answer the same **404** with the same body, so a probe learns nothing
- A token reaches only its own scope:
  - guest token: its own guest and the event, never the guest list or other guests
  - photo token: upload and list the photos of its own guest only; never the answer, the message or the note
  - save-the-date token: no address, no guest names
  - stand token: only the photos of the device cookie
- One-time tokens (editor invites, account links) are marked used in the same transaction that uses them, with the row locked (`.for('update')`, as in `apps/dartomat-api/src/features/games/games.service.ts`)
- **Logs**: the request log masks every path segment of 43 base64url characters as `[token]` (`redactTokens()` in `packages/server/core/src/logger.ts`) and redacts `Cookie`, `Set-Cookie`, `Referer` and `Location`. So every token is exactly 32 bytes in base64url and a path segment of its own, never in a query string. The error handler logs a failed query without its parameters (`DrizzleQueryError`). Never log a token yourself. The Traefik access log is off; if it is turned on, token paths need filtering there too
- Answers that carry live tokens (admin lists, a guest list for hosts) send `Cache-Control: no-store`
- `Referrer-Policy: no-referrer` on token pages: the API gets it from `helmet`, the web app must send it for `/rsvp/…`, `/photos/…`, `/stand/…`, `/save-the-date/…`, `/invite/…`, `/welcome/…`

## Input (OWASP API3, mass assignment)

- Every body, query and param goes through `parse()` (`@server/core/validate`) with a Zod schema from the contracts; only its output reaches the service
- Never spread `req.body` into an insert or update. A field like `role`, `eventId`, `answeredBy` or `userId` is set by the service, never taken from the client
- Limits come from the contracts (`*-limits.ts`), the same numbers the frontend validates against

## Resource limits (OWASP API4)

- `createRateLimit()` (`packages/server/core/src/middleware/rate-limit.ts`) on every public route: RSVP, save the date, photo uploads, stand uploads, invite and account-link routes. Account creation through a token also counts against the sign-up limit
- Counting limits (guests per event, editors, images, `photos.maxPerGuest`, `photos.maxPerDevice`, `photos.maxPerEvent`) are checked on the server, inside the transaction that inserts, with the parent row locked. A check before the transaction lets parallel requests pass the limit
- Time windows (RSVP deadline, upload window, past events) are checked on the server against the event's `timeZone`, never trusted from the client
- Pasted lists and bulk inserts have a maximum (100 names)
- Server rendering: when the web app renders a token page on the server, its read request reaches the API from the server's own IP, not the guest's. A per-IP limit on those `GET` routes counts every guest as one client. Limit the writes and uploads the browser sends itself per IP; give the server-rendered reads no per-IP limit or a separate high one, and never trust a client IP forwarded by the web server

## Uploads

- Every file goes through `processImage()` (`packages/server/core/src/images.ts`): type from the bytes, `MAX_INPUT_PIXELS`, re-encoded to WebP, EXIF and GPS dropped. Never store the original bytes
- File size and file count limited in `multer`'s `limits` from `config.uploads.maxFileSizeMb`, as `apps/express-api-base/src/features/notes/notes.images.ts` does, so an oversized upload is rejected while it streams
- Stored under random names from `saveImage()`; the client never chooses a path or name
- Files are served only through routes that check access (member, or the right token), never as a static folder

## Cookies

- The session cookie comes from `server-auth` unchanged (`sid`, http-only)
- The device cookie of the photo stand: random id, `httpOnly`, `sameSite: 'lax'`, `secure` in production, `path: '/api/v1/stand'`, 30 days. It only identifies a device for limits and own photos, never a person

## Output

- CSV export: every cell starting with `=`, `+`, `-` or `@` (also after leading whitespace) gets a leading `'`. Quote cells, escape `"`
- Rich text is sanitized on write with the tags of `RICH_TEXT_TAGS` (`@contracts/rich-text`), as `apps/express-api-base/src/features/notes/notes.sanitize.ts` does
- Error answers come from the error handler of `server-core`: message and details only, no stack, no SQL, no internal ids of other users
- Public answers never contain emails of hosts; names only when set

## CSRF

- The origin check (`packages/server/core/src/middleware/origin-check.ts`) rejects state-changing requests from other origins. Public token routes change state too (RSVP, uploads) and stay behind it
- No state change on `GET`

## Beyond this list

This checklist covers what the conventions of this workspace decide. `/security-review` and the claude-security plugin look wider (dependencies, injection classes, the whole repo) and do not know these rules; use them as well before a release.
