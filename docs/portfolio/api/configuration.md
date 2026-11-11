# Configuration

Configuration comes from two places:

- **Environment variables** hold secrets and the pointer to the config file.
- **A JSON file** holds all other settings. Its path is given by `CONFIG_PATH`.

This split lets the JSON file live on the server as a plain mounted file, while secrets come from the stack's environment.

The shared keys of every API app are described in [Configuration](../../backend/configuration.md). This page lists the whole file of `portfolio-api`, including its own keys (`publicUrl`, `rateLimit.contact*`, `mail`, `uploads.maxImagesPerNote`, Env `SMTP_PASSWORD`), which [`src/config/index.ts`](../../../apps/portfolio-api/src/config/index.ts) adds with `extendConfig()`.

Both are loaded and validated once at startup. If a value is missing or invalid, the process prints what is wrong and exits. The rest of the code imports the typed `config` object and never reads `process.env` itself.

## Environment variables

| Variable         | Required | Meaning                                                                           |
| ---------------- | -------- | --------------------------------------------------------------------------------- |
| `CONFIG_PATH`    | yes      | Path to the JSON config file                                                      |
| `DATABASE_URL`   | yes      | Postgres connection string                                                        |
| `SESSION_SECRET` | yes      | Signs the session cookie. At least 32 characters. Changing it logs everyone out.  |
| `SMTP_PASSWORD`  | if mail  | Password of the SMTP account `mail.user`. Required while `mail.enabled` is true   |
| `NODE_ENV`       | no       | `development` (default), `production` or `test`. Development enables pretty logs. |

Locally these come from `.env` (see [`.env.example`](../../../apps/portfolio-api/.env.example)), which the targets `serve`, `start`, `db:migrate`, `db:seed` and `db:studio` of the app load.

## JSON config file

Local development uses [`config/development.json`](../../../apps/portfolio-api/config/development.json). [`config/production.example.json`](../../../apps/portfolio-api/config/production.example.json) is the template for production.

To try settings without committing them, such as `mail.enabled: true` for a real mail, copy `development.json` to `config/development.local.json` (ignored by git) and set `CONFIG_PATH=config/development.local.json` in `.env`.

| Setting                          | Type              | Meaning                                                                              |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `port`                           | number            | Port the API listens on                                                              |
| `logLevel`                       | string            | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`                       |
| `trustProxy`                     | boolean or number | Express "trust proxy". `false` locally, `1` behind one reverse proxy such as Traefik |
| `publicUrl`                      | string            | Where clients reach this API, e.g. `https://api.example.com`. Base of image URLs     |
| `cors.origins`                   | string[]          | Frontend origins allowed to call the API, e.g. `https://app.example.com`             |
| `session.cookieName`             | string            | Name of the session cookie                                                           |
| `session.maxAgeDays`             | number            | Lifetime of a session                                                                |
| `session.secureCookie`           | boolean           | Send the cookie over HTTPS only. `false` locally, `true` in production               |
| `rateLimit.authWindowMinutes`    | number            | Time window for the sign-up/sign-in rate limit                                       |
| `rateLimit.authMaxRequests`      | number            | Allowed sign-up/sign-in requests per IP in that window                               |
| `rateLimit.contactWindowMinutes` | number            | Time window for the contact form rate limit                                          |
| `rateLimit.contactMaxRequests`   | number            | Allowed contact messages per IP in that window                                       |
| `auth.signUpEnabled`             | boolean           | Open `POST /auth/sign-up`. `false` in production: only the admin and existing users  |
| `admin.email`                    | string            | Email of the first admin, created at startup while no admin exists                   |
| `admin.password`                 | string            | Its password, 8 to 128 characters (16 in production). See the note below             |
| `docs.enabled`                   | boolean           | Serve the API reference under `/docs`                                                |
| `mail.enabled`                   | boolean           | Send mails. `false` locally and in tests: nothing leaves the process                 |
| `mail.host`, `mail.port`         | string, number    | SMTP server                                                                          |
| `mail.secure`                    | boolean           | `true` for TLS from the start (port 465), `false` for STARTTLS (port 587)            |
| `mail.user`                      | string            | SMTP login; the password is `SMTP_PASSWORD`                                          |
| `mail.from`                      | string            | Sender, e.g. `Portfolio <api@example.com>`                                           |
| `mail.to`                        | string            | Where contact messages are forwarded                                                 |
| `uploads.dir`                    | string            | Folder for image files, relative to the working directory or absolute                |
| `uploads.maxFileSizeMb`          | number            | Maximum size of one uploaded file                                                    |
| `uploads.maxImagesPerNote`       | number            | Maximum number of images per note                                                    |
| `uploads.maxImageWidth`          | number            | Wider images are scaled down to this width in pixels                                 |

Every setting is required; there are no hidden defaults.

### The admin password

`admin.password` is the one secret in the JSON file. Treat it accordingly:

- The values in `development.json` and `test.json` are committed and only for local use. Never reuse them.
- In production, set a strong password in the mounted config file before the first start, and keep that file readable only by the deploy user.
- While no admin exists, the API refuses to start in production if `admin.password` is one of the placeholders of the committed config files or has fewer than 16 characters. It logs the reason and exits with code 1. The list is in [`admin.password.ts`](../../../packages/server/auth/src/admin.password.ts).
- It is used once, to create the first admin (see [Authentication](../../backend/authentication.md#the-first-admin)). After that it can be replaced by any value of valid length. One exception in production: an admin whose password is still a placeholder (created by a version without the check) gets `admin.password` as new password and is signed out, or the API exits if that value is not strong either.

### Settings that must match your deployment

- **`trustProxy`:** behind a reverse proxy this must be set, otherwise Express does not know the request was HTTPS and refuses to set the secure cookie. It also makes the rate limit see the real client IP instead of the proxy's.
- **`cors.origins`:** must contain the exact origin of the frontend (scheme, host and port, no path). Requests from other origins are rejected.
- **`session.secureCookie`:** must be `true` in production.
- **`publicUrl`:** the public origin of the API. The image URLs in `GET /portfolio` are built from it, so a wrong value means broken images on the start page.

### Mail

Contact messages are always stored. With `mail.enabled: true` they are also forwarded by SMTP to `mail.to` (see [CMS content](cms-content.md#contact-messages)); startup fails if `SMTP_PASSWORD` is missing then. With `false`, sending is simulated and logged at `debug`, which is what development and the tests use.

## Adding a setting

1. Add it to `fileSchema` in [`src/config/index.ts`](../../../apps/portfolio-api/src/config/index.ts).
2. Add it to all files in `config/`, and to the real production file on the server.
3. Use it through the `config` object.
