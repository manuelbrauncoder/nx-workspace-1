# styles

Global SCSS every Angular app shares. Uses theme tokens only: colors, radius and fonts stay in each app, because they belong to its brand and its Spartan style.

| Item    | Value                                                    |
| ------- | -------------------------------------------------------- |
| Folder  | [packages/shared/styles](../../packages/shared/styles)   |
| Use     | `@use 'styles/…'` with `packages/shared` as include path |
| Tags    | `type:styles`, `scope:shared`                            |
| Used by | `angular-base`, `portfolio-web` (`implicitDependencies`) |

## Contents

| File                    | What it holds                                                   |
| ----------------------- | --------------------------------------------------------------- |
| `abstracts/_index.scss` | Mixins such as `up($breakpoint)`, emits no CSS                  |
| `base/_global.scss`     | Element defaults, smooth scrolling unless reduced motion is set |
| `base/_typography.scss` | Font families from the tokens                                   |
| `base/_rich-text.scss`  | Styles of stored rich text                                      |
| `layout/_index.scss`    | `.page-container`, width and padding from tokens                |

## In an app

```scss
// src/styles/styles.scss
@use 'themes';
@use 'base/fonts';
@use 'styles/base/global';
@use 'styles/base/typography';
@use 'styles/base/rich-text';
@use 'styles/layout';
```

Component SCSS uses `@use 'styles/abstracts' as *;`. An app sets `--page-container-max-width`, `--page-container-padding` and `--page-container-padding-md` in its theme to change the container. See [Styling](../frontend/styling.md).
