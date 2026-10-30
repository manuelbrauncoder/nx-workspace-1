# angular-base

The reference Angular app of the workspace: server-side rendered, translated (German and English), with sign-in against `express-api-base`, the `notes` feature as the reference for CRUD, legal pages and a showcase of every UI wrapper. A new Angular app takes it as its template.

| Item    | Value                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------- |
| Folder  | [apps/angular-base](../../apps/angular-base)                                                      |
| Tags    | `type:app`, `scope:base`                                                                          |
| Locally | <http://localhost:4000>, talks to `express-api-base` on port 3000                                 |
| Libs    | `core`, `ui`, `styles`, `contracts` (and `helm-vega` through `ui`)                                |
| Image   | `ghcr.io/<owner>/nx1-angular-base`, tag `nx1-angular-base-v*`, see [Deployment](../deployment.md) |

## Running it

```bash
pnpm nx serve angular-base
```

The dev server renders on the server as well and reloads on change. To work on the Express server in `src/server.ts` the way it runs in the container, build and run the server in two terminals instead:

```bash
pnpm nx build angular-base -c watch
```

```bash
pnpm nx server angular-base
```

For sign-in and notes the API must run too, see [express-api-base](express-api-base.md). Without it the showcase, the legal pages and the 404 page still work.

## Pages

| Route                                    | Feature    | Content                                                |
| ---------------------------------------- | ---------- | ------------------------------------------------------ |
| `/sign-in`, `/sign-up`                   | `auth`     | Sign-in and sign-up against the API                    |
| `/notes`, `/notes/new`, `/notes/:id`     | `notes`    | Notes with rich text and images, behind the sign-in    |
| `/showcase/…`                            | `showcase` | Typography, colors, form controls and every UI wrapper |
| `/imprint`, `/privacy`, `/accessibility` | `legal`    | Legal pages with the data of `SITE_OWNER`              |

## Configuration

The runtime config is [config/app-config.json](../../apps/angular-base/config/app-config.json), loaded before the first render: `apiBaseUrl`, `environment`, `logLevel`, `siteUrl`, `allowIndexing` and optionally `allowSignUp`. A deployment mounts its own file, see [API and runtime config](../frontend/api-and-config.md#runtime-config).

In the code:

- `APP_NAME` in [app.config.ts](../../apps/angular-base/src/app/app.config.ts): shown in header, footer, page title and developer greeting
- `SITE_OWNER` in [site-owner.ts](../../apps/angular-base/src/app/site-owner.ts): the operator of the site for the legal pages, see [Legal pages](../frontend/legal-pages.md)
- Shared texts of the app in [src/app/i18n](../../apps/angular-base/src/app/i18n), page texts next to each page, see [Internationalization](../frontend/i18n.md)
- Theme tokens and fonts in [src/styles](../../apps/angular-base/src/styles), see [Styling](../frontend/styling.md)

## How it is built

Feature-based clean architecture with the layers `presentation → application → domain → api`, explained in [Frontend architecture](../frontend/architecture.md). The topic pages under [frontend/](../README.md#frontend) all use this app for their examples.
