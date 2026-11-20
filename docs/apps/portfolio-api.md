# portfolio-api

The backend of the portfolio site, in production: the content of the start page as CMS sections, uploaded images, the contact form with mail forwarding and the legal pages as HTML. Built like `express-api-base` on the same libs, so this page only covers what differs.

| Item     | Value                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Folder   | [apps/portfolio-api](../../apps/portfolio-api)                                                      |
| Tags     | `type:api-app`, `scope:portfolio`                                                                   |
| Locally  | <http://localhost:3100>, routes under `/api/v1`, API reference at <http://localhost:3100/docs>      |
| Database | `portfolio_api`, tests `portfolio_api_test`                                                         |
| Libs     | `server-core`, `server-auth`, `contracts`, `portfolio-contracts`                                    |
| Image    | `ghcr.io/<owner>/nx1-portfolio-api`, tag `nx1-portfolio-api-v*`, see [Deployment](../deployment.md) |

## Running it

Once:

```bash
cp apps/portfolio-api/.env.example apps/portfolio-api/.env
```

Set `SESSION_SECRET` in that file, then create the tables and load the initial content from [seed/](../../apps/portfolio-api/seed):

```bash
pnpm nx run portfolio-api:db:migrate
```

```bash
pnpm nx run portfolio-api:db:seed
```

Then, every time:

```bash
pnpm nx serve portfolio-api
```

The targets are those of [express-api-base](express-api-base.md#running-it) plus `db:seed`. The seed only creates sections and legal pages that do not exist yet, running it again is safe.

## Endpoints

All under `/api/v1`, only `/health` and `/docs` are at the root.

| Path           | From          | Content                                                                                   |
| -------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `/auth/…`      | `server-auth` | Sign-in; sign-up is closed in production                                                  |
| `/admin/…`     | `server-auth` | Users for admins                                                                          |
| `/portfolio/…` | app           | `GET` the start page content (draft projects for admins only), `PATCH` a section as admin |
| `/media/…`     | app           | Image uploads for the content, served without a session                                   |
| `/contact/…`   | app           | `POST` from the contact form, the inbox for admins                                        |
| `/legal/…`     | app           | The legal pages as sanitized HTML in both languages                                       |
| `/notes/…`     | app           | Taken over from the base                                                                  |

Details: [CMS content](../portfolio/api/cms-content.md).

## Differences to express-api-base

- **Route prefix**: `createServer({ prefix: '/api/v1' })`, the OpenAPI document adds the same prefix
- **Config**: own keys `publicUrl` (base of the image URLs), `rateLimit.contactWindowMinutes`/`contactMaxRequests`, `mail` and the environment variable `SMTP_PASSWORD`, added with `extendConfig()`. See [Portfolio API configuration](../portfolio/api/configuration.md)
- **Mail**: contact messages are always stored and forwarded by SMTP while `mail.enabled` is set. Locally mail is off. To try it, copy `config/development.json` to `config/development.local.json` (ignored by git) and point `CONFIG_PATH` to it
- **Sign-up**: `auth.signUpEnabled` is `false` in production
- **Seed**: `node dist/scripts/seed.js` in the container loads the initial content once
- **Schemas**: those of portfolio, media, contact and legal pages are in `portfolio-contracts`, shared with `portfolio-web`
