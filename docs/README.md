# Documentation

Long-form documentation for `angular-base`. The short rule set that tooling and AI agents work from lives in [CLAUDE.md](../CLAUDE.md). These docs explain the same rules with the reasoning behind them and with examples taken from the code.

## Reading order

| Doc                                         | What it covers                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| [Getting started](getting-started.md)       | Install, scripts, dev server, tooling                                             |
| [Architecture](architecture.md)             | Layers, folder map, import rules, the `notes` reference feature, adding a feature |
| [API and runtime config](api-and-config.md) | DTOs, models, mappers, repositories, `app-config.json`                            |
| [State management](state-management.md)     | Feature stores, `AsyncState`, `mutation()`, `patchResource()`                     |
| [Error handling](error-handling.md)         | `Failure`, the HTTP interceptor, how failures reach the user                      |
| [Authentication](auth.md)                   | Session cookie, `AuthStore`, guards, sign-in and sign-up, server rendering        |
| [Forms](forms.md)                           | Signal Forms and the `app-form-*` controls                                        |
| [UI components](ui-components.md)           | The `app-ui-*` wrappers around the UI library                                     |
| [Styling](styling.md)                       | Tailwind, component SCSS, theme tokens, light and dark mode                       |
| [Internationalization](i18n.md)             | Translations, page scopes, language switch, dates                                 |
| [Logging](logging.md)                       | `AppLog`, `ServerLog`, log levels                                                 |
| [SEO](seo.md)                               | Title and meta tags, indexing, HTTP status, `robots.txt`, sitemap                 |
| [Legal pages](legal-pages.md)               | Imprint, privacy policy, accessibility statement, what a project has to fill in   |
| [CI and deployment](ci-and-deployment.md)   | GitHub Actions pipeline, container image, settings of a deployment                |

New to the project: read _Getting started_ and _Architecture_ first, then open the `notes` feature next to _State management_.

## Conventions in these docs

- Code samples are taken from the repository. The link above a sample points to the file it comes from.
- The UI is translated, German is the default language. Samples that explain something else show German texts inline to stay short, in the code they are translation keys, see [Internationalization](i18n.md). Code, comments and log messages are English.
- When a doc and the code disagree, the code is right. Please fix the doc in the same change.
