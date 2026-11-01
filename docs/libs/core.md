# core

App-wide infrastructure every Angular app builds on. Knows neither apps nor `ui` nor the UI library, and contains no value specific to one app.

| Item    | Value                                                  |
| ------- | ------------------------------------------------------ |
| Folder  | [packages/shared/core](../../packages/shared/core/src) |
| Alias   | `@core/*`, e.g. `@core/i18n/i18n.service`              |
| Tags    | `type:core`, `scope:shared`                            |
| Used by | `angular-base`, `portfolio-web`, `ui`                  |

## Contents

| Folder        | What it holds                                                                   | Guide                                                               |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `config/`     | `AppConfigService`, the runtime config loaded before the first render           | [API and runtime config](../frontend/api-and-config.md)             |
| `failure/`    | `Failure`, the one error type of the apps, and `toFailure()`                    | [Error handling](../frontend/error-handling.md)                     |
| `http/`       | Interceptors for credentials and failures, the HTTP status of a server response | [Error handling](../frontend/error-handling.md)                     |
| `i18n/`       | `I18nService`, pipes `t`, `localDate` and `localized`, scopes and shared texts  | [Internationalization](../frontend/i18n.md)                         |
| `layout/`     | `shellLayout()`: how the app shell frames a page                                | [Frontend architecture](../frontend/architecture.md#app-shell)      |
| `log/`        | `AppLog`, `AppErrorHandler`, the developer greeting                             | [Logging](../frontend/logging.md)                                   |
| `seo/`        | `SeoService`, `routeSeo()`, `injectPageSeo()`, `PageSeoImage`                   | [SEO](../frontend/seo.md)                                           |
| `state/`      | `AsyncState`, `mutation()`, `patchResource()`, `settled()`                      | [State management](../frontend/state-management.md)                 |
| `theme/`      | `ThemeService` for light and dark mode                                          | [Styling](../frontend/styling.md)                                   |
| `testing/`    | `setupTestEnvironment()` for the `test-setup.ts` of every Angular project       | [Workspace](../workspace.md#conventions)                            |
| `app-name.ts` | The token `APP_NAME`, set by every app                                          | [Frontend architecture](../frontend/architecture.md#app-wide-setup) |

## Rules

- The translation library (`@jsverse/*`) is imported in `i18n/` only, everything else uses `I18nService` and the pipes
- Keys added to the runtime config later are optional with a default, so the config of a running deployment stays valid
- Its own specs use test texts from `testing/core-test-texts.ts`, since `core` knows the texts of neither `ui` nor an app
