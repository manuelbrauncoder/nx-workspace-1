# Styling

Styling combines Tailwind utilities with SCSS. Tailwind covers small layout adjustments in templates, SCSS covers everything with structure, states or variants. Both draw their colors from the same theme tokens, which is what makes light and dark mode work.

## File structure

Each app owns what makes up its look: tokens, fonts and the Tailwind entry. Everything else is shared through the `styles` lib.

```text
apps/angular-base/src/styles/   this app
├── tailwind.css                Tailwind entry: layer order, sources, Tailwind, Spartan preset, @theme
├── styles.scss                 global SCSS entry, only @use
├── themes/
│   ├── _light.scss             tokens on :root
│   └── _dark.scss              tokens on :root.dark
└── base/
    └── _fonts.scss             @font-face for the self-hosted fonts in public/fonts

packages/shared/styles/         every app
├── base/
│   ├── _global.scss            element defaults
│   ├── _typography.scss        font families
│   └── _rich-text.scss         stored rich text
├── layout/
│   └── _index.scss             global layout classes, e.g. .page-container
└── abstracts/
    └── _index.scss             mixins and variables, emits no CSS
```

`styles.scss` uses the app's partials by relative path and the shared ones through `styles/`:

```scss
@use 'themes';
@use 'base/fonts';
@use 'styles/base/global';
@use 'styles/base/typography';
@use 'styles/base/rich-text';
@use 'styles/layout';
```

Tailwind only scans the app and the shared libs, not the other apps of the workspace:

```css
@import 'tailwindcss' source(none);
@source '..';
@source '../../../../packages/shared';
```

[apps/angular-base/project.json](../../apps/angular-base/project.json) loads `tailwind.css` before `styles.scss`. The order matters: `tailwind.css` declares the cascade layers first.

```css
@layer theme, base, components, utilities;
```

`tailwind.css` is plain CSS and contains only Tailwind, the Spartan preset and the `@theme` block. `styles.scss` contains only `@use` lines. Styles go into the partials.

## Tailwind or SCSS

| Situation                                                | Use                        |
| -------------------------------------------------------- | -------------------------- |
| Up to about three classes on an element (`class="mt-2"`) | Tailwind in the template   |
| More than that                                           | SCSS file of the component |
| States, variants, responsive behavior, nested structure  | SCSS file of the component |

The limit keeps templates readable. A long class list hides the structure of the markup and is hard to review. Once an element needs more, give it a class and move the styles:

[apps/angular-base/src/app/features/notes/presentation/notes-list/notes-list.scss](../../apps/angular-base/src/app/features/notes/presentation/notes-list/notes-list.scss)

```scss
@use 'styles/abstracts' as *;

.notes-grid {
  display: grid;
  gap: 1rem;

  @include up(sm) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include up(lg) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

Every component has its own `name.scss` next to `name.ts` and `name.html`. Inline styles are not used. The class order of Tailwind classes is handled by Prettier.

## Rules for SCSS

- **Theme tokens only.** Colors are `var(--background)`, `var(--primary)`, `var(--muted-foreground)` and so on. No hard-coded colors, otherwise dark mode breaks
- **No `@apply`.** Write the CSS property. `@apply` ties SCSS to Tailwind internals for no gain
- **Global SCSS lives in a layer.** Element defaults go into `@layer base`, global classes into `@layer components`. Tailwind utilities are in the later `utilities` layer and can therefore always override them

[packages/shared/styles/layout/\_index.scss](../../packages/shared/styles/layout/_index.scss)

```scss
@layer components {
  .page-container {
    margin-inline: auto;
    width: 100%;
    max-width: 72rem;
    padding-inline: 1rem;
  }
}
```

### Helpers

Component SCSS gets mixins through the abstracts:

```scss
@use 'styles/abstracts' as *;
```

The path works because `packages/shared` is an include path (`stylePreprocessorOptions.includePaths`) in `apps/angular-base/project.json`. Currently there is the `up($name)` mixin for the breakpoints `sm`, `md`, `lg` and `xl`, which match the Tailwind defaults. The abstracts emit no CSS on their own, so they are safe to `@use` in every component.

## Theme tokens

Tokens are CSS custom properties, defined once per theme:

[apps/angular-base/src/styles/themes/\_light.scss](../../apps/angular-base/src/styles/themes/_light.scss)

```scss
:root {
  color-scheme: light;

  --background: oklch(1 0 0);
  --foreground: oklch(0.129 0.042 264.695);
  --primary: oklch(0.208 0.042 265.755);
  --primary-foreground: oklch(0.984 0.003 247.858);
  // ...
}
```

[apps/angular-base/src/styles/themes/\_dark.scss](../../apps/angular-base/src/styles/themes/_dark.scss) defines the same names on `:root.dark`.

Surface tokens come in pairs: `--primary` is a background, `--primary-foreground` the text color with enough contrast on it. Use them together to stay within WCAG AA.

| Group    | Tokens                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Surfaces | `background`/`foreground`, `card`, `popover` (each with `-foreground`)             |
| Actions  | `primary`, `secondary`, `muted`, `accent` (each with `-foreground`), `destructive` |
| Lines    | `border`, `input`, `ring`                                                          |
| Charts   | `chart-1` to `chart-5`                                                             |
| Sidebar  | `sidebar` and its variants                                                         |
| Shape    | `radius`                                                                           |

The page `/showcase/colors` shows every token with its current value in both themes.

The same tokens are available as Tailwind utilities (`bg-primary`, `text-muted-foreground`, `border-border`). The mapping for the standard tokens comes from the Spartan preset imported in `tailwind.css`.

### Tokens of the layout and the brand

Besides the colors, a theme can set:

- `--brand` and `--brand-foreground`: the colors of `variant="brand"` on `appUiButton`, the one main action of a page. angular-base uses its primary color, portfolio-web amber. Both are exposed in `tailwind.css` as `bg-brand` and `text-brand-foreground`
- `--page-container-max-width`, `--page-container-padding` and `--page-container-padding-md`: width and padding of `.page-container` from the `styles` lib. Without them it is 72rem wide with 1rem padding. portfolio-web sets 81rem and 3rem from `md` up

### Adding a token

1. Define it in `themes/_light.scss` and in `themes/_dark.scss`. A token that exists in one theme only breaks the other
2. Expose it to Tailwind in the `@theme` block of [tailwind.css](../../apps/angular-base/src/styles/tailwind.css), e.g. `--color-success: var(--success);` gives you `bg-success` and `text-success`
3. Add it to [color-tokens.ts](../../apps/angular-base/src/app/features/showcase/presentation/colors/color-tokens.ts), so it appears on the colors page
4. Check the contrast in both themes

### Fonts

The fonts are self-hosted variable fonts in `apps/angular-base/public/fonts`, declared in `base/_fonts.scss` and assigned in the `@theme` block:

| Token            | Font           | Used for             |
| ---------------- | -------------- | -------------------- |
| `--font-sans`    | Figtree        | body text            |
| `--font-heading` | Space Grotesk  | `h1` to `h6`         |
| `--font-mono`    | JetBrains Mono | `code`, `pre`, `kbd` |

## Light and dark mode

The theme is the class `dark` on the `<html>` element. `ThemeService` in [packages/shared/core/src/theme/](../../packages/shared/core/src/theme) sets it:

```ts
readonly mode = signal<ThemeMode>(this._readStoredMode()); // 'light' | 'dark' | 'system'
readonly resolved = computed<'light' | 'dark'>(/* ... */);

setMode(mode: ThemeMode): void
```

- `mode` is what the user chose. `system` follows the operating system and reacts when it changes
- `resolved` is what is actually shown, always `light` or `dark`. Bind to this when a component needs to know the theme, as the toaster in `app.html` does
- The choice is stored in `localStorage` under the key `theme`
- Without a stored choice the mode is `system`. An app designed dark first provides `DEFAULT_THEME_MODE` (`@core/theme/theme.service`), e.g. `{ provide: DEFAULT_THEME_MODE, useValue: 'dark' }`, and uses the same fallback in its inline script. The user can still switch. `portfolio-web` works this way

An inline script in [index.html](../../apps/angular-base/src/index.html) sets the class before the first paint, so a dark page does not flash white on load. It duplicates the logic of the service on purpose. If you change the storage key or the logic, change both.

The user switches the theme with `app-theme-toggle` in the app header.

An app that exists in one theme only provides `FORCED_THEME_MODE` (`@core/theme/theme.service`), e.g. `{ provide: FORCED_THEME_MODE, useValue: 'dark' }`. `ThemeService` then keeps that mode, ignores the stored choice and `setMode()`. Such an app sets `class="dark"` on `<html>` in its `index.html` instead of the inline script and shows no `app-theme-toggle`. `dartomat-web` works this way.

Components do not need to know about any of this. A component that uses tokens is themed automatically. Do not write `.dark` selectors in component SCSS. If a color has to differ between the themes, that is a new token.

## Accessibility

- Text and interactive elements must meet WCAG AA contrast in both themes
- Keep focus visible. When you style `:focus-visible` yourself, use a token:

  ```scss
  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  ```

- Form controls need nothing of their own: `FormControlShell` outlines the focused control in `--ring`, also when it is invalid ([forms.md](forms.md#focus-outline))

### Touch targets and spacing

- Every interactive element of a product page is at least **44 × 44 CSS pixels** (WCAG 2.5.5, AAA, used as the bar for all apps). Below that, the element gets padding that makes up the difference inside the tap area, not a bigger visual control
- Two targets next to each other keep at least 8px between them, so a thumb hits the one it means
- Rhythm: sections of a page are separated by the same spacing step (`gap-*` or `py-*` from the Tailwind scale, 4px per step), not by ad-hoc margins. Lists of cards use one gap
- The `ui` wrappers are smaller by default: `size="default"` is 36px high, `icon` 36px square. A product page that needs 44px asks for a bigger size or wraps the control; changing the wrapper defaults is a decision for the lib, not for a page

## Rules in short

- `tailwind.css` first, `styles.scss` second. `styles.scss` only has `@use`
- About three Tailwind classes in the template, beyond that component SCSS
- SCSS uses theme tokens, no `@apply`, no hard-coded colors
- Global SCSS in `@layer base` or `@layer components`
- New tokens in both themes, exposed through `@theme`
- Theme switching through `ThemeService` only
