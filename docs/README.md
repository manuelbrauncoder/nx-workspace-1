# Documentation

Long-form documentation for the workspace: the Angular app `angular-base` with the libs in `packages/shared/`, the API app `express-api-base` with the libs in `packages/server/`, and `packages/contracts`, the wire format both sides share. The portfolio (`portfolio-web`, `portfolio-api`) is built the same way, its own pages are in [portfolio/](portfolio/README.md). The short rule set that tooling and AI agents work from lives in [CLAUDE.md](../CLAUDE.md). These docs explain the same rules with the reasoning behind them and with examples taken from the code.

## Angular apps

| Doc                                         | What it covers                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Getting started](getting-started.md)       | Install, Nx commands, dev server, tooling                                                      |
| [Architecture](architecture.md)             | Apps and libs, layers, import rules, the `notes` reference feature, adding a feature or an app |
| [API and runtime config](api-and-config.md) | DTOs, models, mappers, repositories, `app-config.json`                                         |
| [State management](state-management.md)     | Feature stores, `AsyncState`, `mutation()`, `patchResource()`                                  |
| [Error handling](error-handling.md)         | `Failure`, the HTTP interceptor, how failures reach the user                                   |
| [Authentication](auth.md)                   | Session cookie, `AuthStore`, guards, sign-in and sign-up, server rendering                     |
| [Forms](forms.md)                           | Signal Forms and the `app-form-*` controls                                                     |
| [UI components](ui-components.md)           | The `app-ui-*` wrappers around the UI library, Spartan styles per app                          |
| [Styling](styling.md)                       | Tailwind, component SCSS, theme tokens, light and dark mode                                    |
| [Internationalization](i18n.md)             | Translations, page scopes, language switch, dates                                              |
| [Logging](logging.md)                       | `AppLog`, `ServerLog`, log levels                                                              |
| [SEO](seo.md)                               | Title and meta tags, indexing, HTTP status, `robots.txt`, sitemap                              |
| [Legal pages](legal-pages.md)               | Imprint, privacy policy, accessibility statement, what a project has to fill in                |
| [CI and deployment](ci-and-deployment.md)   | GitHub Actions pipeline, container image, settings of a deployment                             |

## API apps

| Doc                                         | What it covers                                                    |
| ------------------------------------------- | ----------------------------------------------------------------- |
| [Getting started](api/getting-started.md)   | Setup with the local Postgres, trying the API, Nx commands        |
| [Architecture](api/architecture.md)         | App and server libs, request flow, adding a feature or an API app |
| [Configuration](api/configuration.md)       | Environment variables, the JSON config, `extendConfig()`          |
| [Authentication](api/authentication.md)     | Sessions, roles, admin, CSRF protection, frontend integration     |
| [Database](api/database.md)                 | Drizzle tables, migrations, the auth tables of `server-auth`      |
| [Notes and images](api/notes-and-images.md) | Notes, rich text sanitizing, image uploads                        |
| [Testing](api/testing.md)                   | Test databases, helpers, what is covered                          |
| [Deployment](api/deployment.md)             | Image, release tags, Portainer stack                              |

New to the project: read _Getting started_ and _Architecture_ first, then open the `notes` feature next to _State management_.

## Conventions in these docs

- Code samples are taken from the repository. The link above a sample points to the file it comes from.
- The UI is translated, German is the default language. Samples that explain something else show German texts inline to stay short, in the code they are translation keys, see [Internationalization](i18n.md). Code, comments and log messages are English.
- When a doc and the code disagree, the code is right. Please fix the doc in the same change.
