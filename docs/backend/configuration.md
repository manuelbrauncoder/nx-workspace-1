# Configuration

Configuration comes from two places:

- **Environment variables** hold secrets and the pointer to the config file.
- **A JSON file** holds all other settings. Its path is given by `CONFIG_PATH`.

This split lets the JSON file live on the server as a plain mounted file, while secrets come from the stack's environment.

Both are loaded and validated once at startup in [`packages/server/core/src/config.ts`](../../packages/server/core/src/config.ts). If a value is missing or invalid, the process prints what is wrong and exits. The rest of the code imports the typed `config` object and never reads `process.env` itself.

The keys every API app has (everything below except `uploads.maxImagesPerNote`) are defined in `server-core`, and the libs read them from `@server/core/config`. An app adds its own keys with `extendConfig()` in its `src/config/index.ts`, and its features import the extended `config` from there. A key the shared settings have too, such as `uploads`, is merged into them. A second argument adds environment variables, which end up under `config.env`:

```ts
export const config = extendConfig(
  {
    // merged into the shared `uploads` settings
    uploads: z.object({ maxImagesPerNote: z.number().int().positive() }),
  },
  { SMTP_PASSWORD: z.string().optional() }, // portfolio-api, read as config.env.SMTP_PASSWORD
);
```

Keys added to the shared settings later have a default, so the file of an existing deployment stays valid: `auth` (`{ "signUpEnabled": true }`) and `uploads` (`./uploads`, 10 MB, 2000 px).

## Environment variables

| Variable         | Required | Meaning                                                                           |
| ---------------- | -------- | --------------------------------------------------------------------------------- |
| `CONFIG_PATH`    | yes      | Path to the JSON config file                                                      |
| `DATABASE_URL`   | yes      | Postgres connection string                                                        |
| `SESSION_SECRET` | yes      | Signs the session cookie. At least 32 characters. Changing it logs everyone out.  |
| `NODE_ENV`       | no       | `development` (default), `production` or `test`. Development enables pretty logs. |

Locally these come from `.env` (see [`apps/express-api-base/.env.example`](../../apps/express-api-base/.env.example)), which the targets `serve`, `start`, `db:migrate` and `db:studio` of the app load.

## JSON config file

Local development uses [`apps/express-api-base/config/development.json`](../../apps/express-api-base/config/development.json). [`apps/express-api-base/config/production.example.json`](../../apps/express-api-base/config/production.example.json) is the template for production.

| Setting                       | Type              | Meaning                                                                                           |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `port`                        | number            | Port the API listens on                                                                           |
| `logLevel`                    | string            | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`                                    |
| `trustProxy`                  | boolean or number | Express "trust proxy". `false` locally, `1` behind one reverse proxy such as Traefik              |
| `cors.origins`                | string[]          | Frontend origins allowed to call the API, e.g. `https://app.example.com`                          |
| `session.cookieName`          | string            | Name of the session cookie                                                                        |
| `session.maxAgeDays`          | number            | Lifetime of a session                                                                             |
| `session.secureCookie`        | boolean           | Send the cookie over HTTPS only. `false` locally, `true` in production                            |
| `rateLimit.authWindowMinutes` | number            | Time window for the sign-up/sign-in rate limit                                                    |
| `rateLimit.authMaxRequests`   | number            | Allowed sign-up/sign-in requests per IP in that window                                            |
| `auth.signUpEnabled`          | boolean           | Open `POST /auth/sign-up`. `false` lets only the admin and existing users sign in. Default `true` |
| `admin.email`                 | string            | Email of the first admin, created at startup while no admin exists                                |
| `admin.password`              | string            | Its password, 8 to 128 characters. See the note below                                             |
| `docs.enabled`                | boolean           | Serve the API reference under `/docs`                                                             |
| `uploads.dir`                 | string            | Folder for image files, relative to the working directory or absolute                             |
| `uploads.maxFileSizeMb`       | number            | Maximum size of one uploaded file                                                                 |
| `uploads.maxImagesPerNote`    | number            | Maximum number of images per note                                                                 |
| `uploads.maxImageWidth`       | number            | Wider images are scaled down to this width in pixels                                              |

Every setting is required; there are no hidden defaults.

### The admin password

`admin.password` is the one secret in the JSON file. Treat it accordingly:

- The values in `development.json` and `test.json` are committed and only for local use. Never reuse them.
- In production, set a strong password in the mounted config file before the first start, and keep that file readable only by the deploy user.
- It is used once, to create the first admin (see [Authentication](authentication.md#roles-and-admin)). After that the value can be replaced by any placeholder of valid length.

### Settings that must match your deployment

- **`trustProxy`:** behind a reverse proxy this must be set, otherwise Express does not know the request was HTTPS and refuses to set the secure cookie. It also makes the rate limit see the real client IP instead of the proxy's.
- **`cors.origins`:** must contain the exact origin of the frontend (scheme, host and port, no path). Requests from other origins are rejected.
- **`session.secureCookie`:** must be `true` in production.

## Adding a setting

1. Add it to `fileSchema` in [`packages/server/core/src/config.ts`](../../packages/server/core/src/config.ts).
2. Add it to all files in `apps/express-api-base/config/`, and to the real production file on the server.
3. Use it through the `config` object.
