# ui

The UI building blocks of every Angular app: wrappers around Spartan, the Signal Forms controls, `app-async-content`, `app-failure-alert`, the theme and language toggles and their texts. The only project that imports Spartan, `@ng-icons` and Tiptap, so swapping the UI library stays inside it.

| Item    | Value                                                           |
| ------- | --------------------------------------------------------------- |
| Folder  | [packages/shared/ui](../../packages/shared/ui/src)              |
| Alias   | `@shared/*`, e.g. `@shared/ui/button/button`                    |
| Tags    | `type:ui`, `scope:shared`                                       |
| Uses    | `core`, `helm-vega` (through `@spartan-ng/helm/*`), `contracts` |
| Used by | `angular-base`, `portfolio-web`                                 |

## Contents

| Folder                              | What it holds                                                                                                        | Guide                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ui/`                               | `app-ui-*` wrappers: button, text, icon, card, alert, dialog, sheet, nav menu, breadcrumb, rich text, toast and more | [UI components](../frontend/ui-components.md)                                  |
| `form-controls/`                    | `app-form-*` controls for Signal Forms, each a complete field                                                        | [Forms](../frontend/forms.md)                                                  |
| `async-content/`                    | `app-async-content`, renders an `AsyncState`                                                                         | [State management](../frontend/state-management.md#in-the-component)           |
| `failure-alert/`                    | `app-failure-alert`, shows a `Failure` with its translated text                                                      | [Error handling](../frontend/error-handling.md)                                |
| `theme-toggle/`, `language-toggle/` | The toggles in the header                                                                                            | [Styling](../frontend/styling.md), [Internationalization](../frontend/i18n.md) |
| `i18n/`                             | Shared texts of the lib (`uiI18n`): `common`, `failure`, `form`, `language`, `theme`                                 | [Internationalization](../frontend/i18n.md)                                    |

## Rules

- Naming: `Ui<Name>` with `app-ui-<name>` or `appUi<Name>`, `Form<Name>` with `app-form-<name>`. Every wrapper has an English JSDoc with an `@example` and an entry on the showcase page of `angular-base`
- Thin wrappers set the Helm directive through `hostDirectives`, no Spartan type appears in the public API
- Own classes use theme tokens only, so the wrappers fit every Spartan style. The colors of `variant="brand"` come from `--brand` of the app
- Stored rich text is shown through `app-ui-rich-text` only, never through an own `[innerHTML]`
