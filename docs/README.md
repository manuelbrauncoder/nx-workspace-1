# Documentation

Long-form documentation of the workspace. How to start everything locally is in the [README](../README.md). The short rule set that tooling and AI agents work from lives in [CLAUDE.md](../CLAUDE.md). These pages explain the same rules with the reasoning behind them and with examples taken from the code.

New here: read the [README](../README.md) and [Workspace](workspace.md), then the page of the app you work on.

## Overview

| Page                        | What it covers                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| [Workspace](workspace.md)   | Projects, tags and scopes, path aliases, Nx commands, conventions, adding an app or a lib |
| [Deployment](deployment.md) | Images and release tags (`nx1-*`), the pipeline, running the images, Portainer stacks     |
| [Releasing](releasing.md)   | Commit messages, versions per app, `nx release`, changelogs, the running version          |

## Apps

| App                                          | What it is                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [angular-base](apps/angular-base.md)         | Reference Angular app: SSR, i18n, sign-in, notes, showcase                                  |
| [express-api-base](apps/express-api-base.md) | Reference API: accounts, admin, notes with images                                           |
| [portfolio-web](apps/portfolio-web.md)       | The portfolio site with its admin area, in production                                       |
| [portfolio-api](apps/portfolio-api.md)       | The backend of the portfolio: CMS content, media, contact, legal pages                      |
| [dartomat-web](apps/dartomat-web.md)         | Dartomat, a scoreboard for 301, mobile first                                                |
| [dartomat-api](apps/dartomat-api.md)         | The backend of Dartomat: games, darts, checkout                                             |
| [vyte-api](apps/vyte-api.md)                 | The backend of vyte: accounts, events, guest lists, CSV, guest links, save the date, photos |

## Libs

| Lib                                                | What it is                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [core](libs/core.md)                               | Angular infrastructure: config, errors, i18n, SEO, logging, state                  |
| [ui](libs/ui.md)                                   | UI wrappers, form controls, toggles                                                |
| [styles](libs/styles.md)                           | Global SCSS                                                                        |
| [helm](libs/helm.md)                               | Generated Spartan components, one lib per style                                    |
| [contracts](libs/contracts.md)                     | Wire format shared by APIs and Angular apps                                        |
| [server-core](libs/server-core.md)                 | Base of every API: config, server, database, errors, images                        |
| [server-auth](libs/server-auth.md)                 | Accounts, sessions, guards, admin                                                  |
| [portfolio-contracts](libs/portfolio-contracts.md) | Wire format of the portfolio                                                       |
| [dartomat-contracts](libs/dartomat-contracts.md)   | Wire format of Dartomat                                                            |
| [vyte-contracts](libs/vyte-contracts.md)           | Wire format of vyte: event, guest and photo limits, event, guest and photo schemas |

## Frontend

How the Angular apps are built. The examples come from `angular-base`.

| Page                                                 | What it covers                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [Architecture](frontend/architecture.md)             | Layers, folder map, import rules, the `notes` reference feature, app shell |
| [API and runtime config](frontend/api-and-config.md) | DTOs, models, mappers, repositories, `app-config.json`                     |
| [State management](frontend/state-management.md)     | Feature stores, `AsyncState`, `mutation()`, `patchResource()`, `settled()` |
| [Error handling](frontend/error-handling.md)         | `Failure`, the HTTP interceptor, how failures reach the user               |
| [Authentication](frontend/auth.md)                   | Session cookie, `AuthStore`, guards, sign-in and sign-up, server rendering |
| [Forms](frontend/forms.md)                           | Signal Forms and the `app-form-*` controls                                 |
| [UI components](frontend/ui-components.md)           | The `app-ui-*` wrappers, Spartan styles per app                            |
| [Styling](frontend/styling.md)                       | Tailwind, component SCSS, theme tokens, light and dark mode                |
| [Internationalization](frontend/i18n.md)             | Translations, page scopes, `Localized`, language switch, dates             |
| [Logging](frontend/logging.md)                       | `AppLog`, `ServerLog`, log levels                                          |
| [SEO](frontend/seo.md)                               | Title and meta tags, indexing, HTTP status, `robots.txt`, sitemap          |
| [Legal pages](frontend/legal-pages.md)               | Imprint, privacy policy, accessibility statement                           |

## Backend

How the API apps are built. The examples come from `express-api-base`.

| Page                                            | What it covers                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| [Architecture](backend/architecture.md)         | Apps and server libs, request flow, validation, errors, adding a feature   |
| [Configuration](backend/configuration.md)       | Environment variables, the JSON config, `extendConfig()`                   |
| [Authentication](backend/authentication.md)     | Sessions, roles, admin, rate limits, CSRF protection, frontend integration |
| [Database](backend/database.md)                 | Drizzle tables, migrations, the auth tables of `server-auth`               |
| [Notes and images](backend/notes-and-images.md) | Notes, rich text sanitizing, image uploads                                 |
| [Testing](backend/testing.md)                   | Test databases, helpers, what is covered                                   |

## Portfolio

What only the portfolio apps have. The overview is on the app pages [portfolio-web](apps/portfolio-web.md) and [portfolio-api](apps/portfolio-api.md).

| Page                                            | What it covers                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| [Start page](portfolio/web/portfolio.md)        | Sections of the start page, their content from the API, `Localized`     |
| [Admin area](portfolio/web/admin.md)            | Users, contact messages, editors for the start page and the legal pages |
| [Legal pages](portfolio/web/legal-pages.md)     | Imprint, privacy, accessibility and cookies as CMS content              |
| [CMS content](portfolio/api/cms-content.md)     | Portfolio sections, media, contact messages, legal pages, seed          |
| [Configuration](portfolio/api/configuration.md) | The config file of `portfolio-api`, mail and `publicUrl`                |

## Vyte (API complete for v1, web app in progress)

Event planning with a guest list and a personal link per guest. The API is complete for v1: accounts, admin, events, the guest list with its CSV export, the guest links, the team, the save the date and the guest photos exist. The web app follows; it is not built yet, the folder `apps/vyte-web` only holds a README.

| Page                            | What it covers                                                                |
| ------------------------------- | ----------------------------------------------------------------------------- |
| [Specification](vyte/spec.md)   | Roles, domain model, flows, API and web draft, open questions (draft)         |
| [Design](vyte/design/README.md) | Snapshot of the design canvas, the Konfetti look, previews of the guest pages |

## Conventions in these docs

- Code samples are taken from the repository. The link above a sample points to the file it comes from.
- The UI is translated, German is the default language. Samples that explain something else show German texts inline to stay short, in the code they are translation keys. Code, comments and log messages are English.
- When a doc and the code disagree, the code is right. Please fix the doc in the same change.
