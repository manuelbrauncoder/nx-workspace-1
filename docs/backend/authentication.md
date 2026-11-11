# Authentication

Users sign up with email and password. There is no email verification and no password reset. A signed-in user is identified by a session cookie.

## Endpoints

| Endpoint              | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `POST /auth/sign-up`  | Creates the user (email, password, optional name) and signs them in |
| `POST /auth/sign-in`  | Signs in                                                            |
| `POST /auth/sign-out` | Ends the session and clears the cookie                              |
| `GET /auth/me`        | Returns the signed-in user, or 401                                  |

Request and response details are in the API reference at `/docs`. Where sign-up is closed, accounts come from [account links](#account-links) instead.

## How a session works

1. On sign-up or sign-in the server creates a session row in the `session` table in Postgres and sends its id in a signed cookie.
2. The browser sends the cookie with every request. The session middleware looks up the row and makes `req.session.userId` available.
3. On sign-out the row is deleted, so the cookie is worthless from that moment on.

Because sessions live in the database, a session survives an API restart, and it can be revoked by deleting its row (see [Roles and admin](#roles-and-admin)).

The cookie is set with:

- **`HttpOnly`:** JavaScript in the browser cannot read it.
- **`SameSite=Lax`:** it is not sent on cross-site POST requests.
- **`Secure`:** HTTPS only, controlled by `session.secureCookie`.

On sign-in a new session id is always issued, which prevents session fixation.

## Passwords

- Hashed with argon2; the plain password is never stored or logged.
- Length between 8 and 128 characters.
- Emails are trimmed and lowercased before storing and comparing.
- A wrong email and a wrong password give the same 401 message, and both take the same time, so sign-in does not reveal which emails are registered. Sign-up does reveal it (409 for a taken email), which is hard to avoid without email verification.

## Rate limiting

Sign-up, sign-in and creating an account from a link share a limit per client IP: `rateLimit.authMaxRequests` requests per `rateLimit.authWindowMinutes`. Beyond that the API answers 429. The counter is kept in memory, so it resets on restart and is per instance. Further limits, e.g. for a contact form, come from `createRateLimit()` in [`packages/server/core/src/middleware/rate-limit.ts`](../../packages/server/core/src/middleware/rate-limit.ts).

With `auth.signUpEnabled: false` sign-up answers 403 before the limit counts, sign-in keeps working. Reading an account link has no limit, see [Account links](#account-links).

### What the request log keeps

The logger ([`packages/server/core/src/logger.ts`](../../packages/server/core/src/logger.ts)) redacts the headers that carry secrets or links: `Cookie` and `Set-Cookie`, so the session cookie never reaches the log, and `Referer` and `Location`, because the referer of a page whose path holds a token would carry that token. Token segments of the URL are replaced by `[token]` in the request log (the URL and the route params). The URL is percent-decoded first, so an encoded token is masked too. A token is any run of 43 or more base64url characters right after a slash, so a token with something stuck to it (a `.` from a link in a chat) is masked as well. The 43 characters are the length of a token. Ids (uuids) stay readable.

When a query fails, the error handler logs the database error and the SQL text, but not the parameters: those hold emails, password hashes and tokens.

## Account links

With closed sign-up an admin creates the account and sends the person a link. The person sets the email and the password through it. Apps that close sign-up mount the routes (see [server-auth](../libs/server-auth.md#in-an-app)).

| Endpoint                            | Who    | What it does                                                                       |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `GET /admin/account-invites`        | admin  | Lists the open links, oldest first                                                 |
| `POST /admin/account-invites`       | admin  | Creates a link for a name, `{ name }`, answers with the token and the expiry       |
| `DELETE /admin/account-invites/:id` | admin  | Revokes an unused link                                                             |
| `GET /auth/account-invites/:token`  | anyone | Returns the name the admin gave the account                                        |
| `POST /auth/account-invites/:token` | anyone | Creates the account with email and password, marks the link used and signs them in |

- **Once and for 7 days.** A link works once and until it expires (`ACCOUNT_INVITE_DAYS`). Links are not renewed: the admin creates a new one. A used link stays in the table as the record of who created the account. When the admin who created a link is deleted, the link keeps its row with no creator.
- **Token.** 32 random bytes, base64url, stored as they are and looked up through a unique index.
- **Same answer for every bad link.** An unknown, used, expired or malformed token answers 404 with the same body, so a probe learns nothing.
- **Works while sign-up is closed.** The link is the permission, `auth.signUpEnabled` does not apply.
- **Name.** The account takes the name of the link unless the person sends another one.
- **Taken email.** Answers 409 and leaves the link open, so the person can try another email. As with sign-up, a 409 reveals that the email is registered.
- **Two requests with one link** create one account: the link row is locked in the transaction that creates the account.
- **Limits.** Creating the account counts against the sign-up limit, see [Rate limiting](#rate-limiting). Reading the link does not, because a server-rendered page reads it from the server's own address.
- **Admin answers** carry live tokens and send `Cache-Control: no-store`.
- **Token in the logs.** The token is in the URL of the public routes, which is why the request log masks it, see [What the request log keeps](#what-the-request-log-keeps).

The code is in [`packages/server/auth/src/account-invites.*.ts`](../../packages/server/auth/src).

## CSRF protection

With cookie auth, another website could try to make the user's browser send a request to the API. Two things prevent that:

- `SameSite=Lax` stops the cookie from being sent on POST requests from other sites.
- The [origin check](../../packages/server/core/src/middleware/origin-check.ts) rejects every state-changing request (anything except GET, HEAD, OPTIONS) whose `Origin` header is neither in `cors.origins` nor the API's own origin. This also covers requests from sibling subdomains, which `SameSite` treats as the same site.

Requests without an `Origin` header are allowed. They come from tools like curl, which carry no browser cookies.

## Protecting routes

```ts
import { currentUserId, requireAuth } from '@server/auth/auth.middleware';

notesRouter.use(requireAuth); // every route below needs a session

notesRouter.get('/', async (req, res) => {
  res.json({ notes: await listNotes(currentUserId(req)) });
});
```

`requireAuth` answers 401 without a session. `currentUserId(req)` returns the user id as a string.

## Roles and admin

Every user has a role, `user` (the default) or `admin`. It is part of the user object, so `GET /auth/me` tells a frontend whether to show admin screens.

### The first admin

At every start the API checks whether an admin exists. If none does, it creates one from `admin.email` and `admin.password` in the JSON config file ([`admin.seed.ts`](../../packages/server/auth/src/admin.seed.ts)). This happens before the server accepts requests, so nobody can sign up with that email first.

- In production (`NODE_ENV=production`) the password must not be a placeholder from the committed config files and must have at least 16 characters. Otherwise the API logs the reason and exits without creating the admin ([`admin.password.ts`](../../packages/server/auth/src/admin.password.ts)).
- Once an admin exists, the two settings are no longer used. Changing `admin.password` later does not change the account's password.
- One exception in production: at every start the API checks each admin's password against the placeholders. An admin who still has one (created by a version without the check) gets `admin.password` as new password and all their sessions are signed out. If `admin.password` is not strong either, the API exits. There is no other way to change an admin's password.
- If the email already belongs to a normal user, that user is not promoted; the API logs a warning and starts without an admin.

### Admin endpoints

| Endpoint                           | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `GET /admin/users`                 | Lists all users, oldest first                                |
| `PATCH /admin/users/:id`           | Sets the role: `{ "role": "admin" }` or `{ "role": "user" }` |
| `DELETE /admin/users/:id`          | Deletes the user, see [Deleting a user](#deleting-a-user)    |
| `DELETE /admin/users/:id/sessions` | Signs the user out on all devices                            |

- Without a session they answer 401, for a normal user 403.
- An admin cannot change their own role or delete their own account (409). At least one admin therefore always remains.
- The role is read from the database on every request. Removing admin rights takes effect immediately; the user's sessions stay valid.

### Deleting a user

`deleteUser()` in [`admin.service.ts`](../../packages/server/auth/src/admin.service.ts) runs in this order:

1. Revokes the user's sessions, so the user cannot write anything while the hooks run.
2. Runs the hooks registered with `onUserDeleted()` ([`user-deletion.ts`](../../packages/server/auth/src/user-deletion.ts)). A hook removes what the database cascade does not cover, e.g. the files of a feature, or the events the user owns in `vyte-api`, which the hook deletes before the user.
3. Deletes the user in a transaction, which also revokes the sessions again. The rows that cascade (memberships, notes, image rows) go with it.
4. Runs the cleanups the hooks returned, e.g. removing the image files, once the deletion is committed.

If step 3 fails, the work of the hooks stays done, so the deletion is not all-or-nothing.

To protect other routes the same way:

```ts
import { requireAdmin } from '@server/auth/auth.middleware';

adminRouter.use(requireAdmin); // 401 without a session, 403 without the admin role
```

## Frontend integration

- **Send credentials with every request.** In Angular: `withCredentials: true` (for example in an HTTP interceptor). With fetch: `credentials: "include"`.
- **Add the frontend's origin to `cors.origins`.**
- **Frontend and API must be on the same site**, meaning the same registrable domain: `app.example.com` and `api.example.com` work. Locally, `localhost:4200` and `localhost:3000` count as the same site.
- **Shared hosting domains do not work** for this setup. Subdomains of `vercel.app`, `herokuapp.com` or `github.io` count as different sites, and browsers then block the cookie as third-party. Use your own domain.
- To find out whether the user is signed in when the app starts, call `GET /auth/me`.
