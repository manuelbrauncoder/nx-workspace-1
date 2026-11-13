# UI components

The visual building blocks of the app are the wrappers in [packages/shared/ui/src/ui/](../../packages/shared/ui/src/ui). They sit between the app and the UI libraries (Spartan with `@ng-icons`, Tiptap for the rich text editor). Features, `core` and the app shell use the wrappers only.

Every wrapper is shown live on `/showcase/components`. The JSDoc on each class has a usage example, which your editor shows on hover.

The wrappers take finished texts and know nothing about translation keys. The samples below show German texts inline to stay short, in the app the caller passes the translated text, e.g. `[heading]="'notesList.empty.heading' | t"`. Texts a wrapper brings itself (the close button, the default loading label, "Abbrechen" in the confirm dialog) come from the shared texts of the ui lib. See [Internationalization](i18n.md).

## Why wrappers

- **The UI library can be swapped.** Spartan, `@ng-icons` and Tiptap are imported in the `ui` lib only ([packages/shared/ui/](../../packages/shared/ui)). Replacing the library touches that lib and nothing else
- **A small, stable API.** A wrapper passes through the inputs the app needs, not everything the library offers. Spartan types do not appear in the public API of a wrapper
- **Accessibility in one place.** Loading labels, decorative icons, dialog descriptions and focus handling are solved once

ESLint enforces the boundary through Nx tags. In an app or in `core`, importing `@spartan-ng/*`, `@ng-icons/*` or `@tiptap/*` fails with "A project tagged with "type:app" is not allowed to import …", and importing a Helm component fails because only `type:ui` may depend on `type:helm` (see [Architecture](architecture.md#how-it-is-enforced)).

The Spartan Helm components themselves are generated into `packages/shared/helm-vega` and reached through the alias `@spartan-ng/helm/*`. Treat that folder as vendor code: Prettier and ESLint skip it.

## Spartan styles

Spartan ships several styles (`nova`, `vega`, `lyra`, `maia`, `mira`, `luma`). A style is not a runtime theme. The templates of the Helm components carry placeholder classes such as `spartan-button-variant-default`, and the Spartan CLI replaces them with the Tailwind classes of the style when it generates the code. The style is therefore baked into the generated files.

To let apps use different styles, each style is its own lib with the same API:

| Lib                         | Style | Used by                 |
| --------------------------- | ----- | ----------------------- |
| `packages/shared/helm-vega` | vega  | default, `angular-base` |

The wrappers in `ui` import `@spartan-ng/helm/*` and do not know the style. Which lib stands behind the alias is decided when an app is built:

- **Default**: `tsconfig.base.json` maps `@spartan-ng/helm/*` to `helm-vega`
- **Another style for one app**: the app's `tsconfig.json` maps the alias to its lib. TypeScript does not merge `paths`, so it repeats every alias of `tsconfig.base.json`. Its `project.json` lists the lib in `implicitDependencies`, so the Nx graph, the cache and `nx affected` know about it

  ```json
  "compilerOptions": {
    "paths": {
      "@api/*": ["../../apps/<app>/src/api/*"],
      "@core/*": ["../../packages/shared/core/src/*"],
      "@features/*": ["../../apps/<app>/src/app/features/*"],
      "@shared/*": ["../../packages/shared/ui/src/*"],
      "@spartan-ng/helm/*": ["../../packages/shared/helm-nova/*/src/index.ts"]
    }
  }
  ```

- **New style lib**: `node tools/scripts/add-helm-style.mjs nova` ([add-helm-style.mjs](../../tools/scripts/add-helm-style.mjs)). It switches `style` and `componentsPath` in `components.json` for the run, generates every component that `helm-vega` has, creates `project.json` and the tsconfig files and restores `components.json` and `tsconfig.base.json`
- **Tokens**: colors, radius and fonts belong to the app's themes, since they have to match the style, see [Styling](styling.md)

Keep the own classes of wrappers and form controls to theme tokens, so they fit every style.

## Naming

| Kind                          | Folder    | Class      | Selector        | Example                       |
| ----------------------------- | --------- | ---------- | --------------- | ----------------------------- |
| Element                       | `<name>/` | `Ui<Name>` | `app-ui-<name>` | `<app-ui-icon name="plus" />` |
| Attribute on a native element | `<name>/` | `Ui<Name>` | `appUi<Name>`   | `<button appUiButton>`        |

Attribute wrappers are used where the native element matters: a button stays a `<button>` or an `<a>`, a heading stays an `<h1>`. `type`, `routerLink` and ARIA attributes then work as usual.

Wrappers with several parts export an imports array, e.g. `UiCardImports` and `UiMenuImports`.

## Catalogue

| Wrapper                  | Use                                           | Import from                                        |
| ------------------------ | --------------------------------------------- | -------------------------------------------------- |
| `UiButton`               | `button[appUiButton]`, `a[appUiButton]`       | `@shared/ui/button/button`                         |
| `UiText`                 | `[appUiText]`                                 | `@shared/ui/text/text`                             |
| `UiIcon`                 | `app-ui-icon`                                 | `@shared/ui/icon/icon`                             |
| `UiSpinner`              | `app-ui-spinner`                              | `@shared/ui/spinner/spinner`                       |
| `UiSkeleton`             | `[appUiSkeleton]`                             | `@shared/ui/skeleton/skeleton`                     |
| `UiCardImports`          | `[appUiCard]` and parts                       | `@shared/ui/card/card`                             |
| `UiAlert`                | `app-ui-alert`                                | `@shared/ui/alert/alert`                           |
| `UiEmpty`                | `app-ui-empty`                                | `@shared/ui/empty/empty`                           |
| `UiAttachmentImports`    | `app-ui-attachment`, `[appUiAttachmentGroup]` | `@shared/ui/attachment/attachment`                 |
| `UiBreadcrumb`           | `app-ui-breadcrumb`                           | `@shared/ui/breadcrumb/breadcrumb`                 |
| `UiRichText`             | `app-ui-rich-text`                            | `@shared/ui/rich-text/rich-text`                   |
| `UiMenuImports`          | `[appUiMenuTrigger]`, `app-ui-menu` and parts | `@shared/ui/menu/menu`                             |
| `UiNavMenu`              | `app-ui-nav-menu`                             | `@shared/ui/nav-menu/nav-menu`                     |
| `UiSheet`                | `app-ui-sheet`                                | `@shared/ui/sheet/sheet`                           |
| `UiDialog`               | `app-ui-dialog`                               | `@shared/ui/dialog/dialog`                         |
| `UiQrCode`               | `app-ui-qr-code`                              | `@shared/ui/qr-code/qr-code`                       |
| `UiListImports`          | `ul[appUiList]`, `li[appUiListItem]`          | `@shared/ui/list/list`                             |
| `UiPagination`           | `app-ui-pagination`                           | `@shared/ui/pagination/pagination`                 |
| `UiTabNav`               | `app-ui-tab-nav`                              | `@shared/ui/tab-nav/tab-nav`                       |
| `UiDialogService`        | `open()`                                      | `@shared/ui/dialog/dialog.service`                 |
| `UiConfirmDialogService` | `confirm()`                                   | `@shared/ui/confirm-dialog/confirm-dialog.service` |
| `UiToastService`         | `success()`, `info()`, `warning()`, `error()` | `@shared/ui/toast/toast.service`                   |
| `UiToaster`              | `app-ui-toaster`                              | `@shared/ui/toast/toaster/toaster`                 |
| `UiToggleGroup`          | `app-ui-toggle-group`                         | `@shared/ui/toggle-group/toggle-group`             |

### Button

```html
<button appUiButton type="submit" [loading]="_saving()" loadingLabel="Wird gespeichert">
  Speichern
</button>
<a appUiButton variant="outline" size="sm" routerLink="/notes">Abbrechen</a>
<button appUiButton variant="ghost" size="icon" type="button" aria-label="Hinzufügen">
  <app-ui-icon name="plus" />
</button>
```

| Input          | Values                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| `variant`      | `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`, `brand` |
| `size`         | `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`       |
| `disabled`     | boolean                                                                    |
| `loading`      | boolean. Shows a spinner in front of the content and blocks the button     |
| `loadingLabel` | Announced to screen readers while loading                                  |

- `brand` is for the one main action of a page, e.g. in a hero. Its colors come from the tokens `--brand` and `--brand-foreground` of the app's theme (angular-base: the primary color, portfolio-web: the trail-marker yellow). Spartan has no such variant, the wrapper replaces the colors of `default`
- Show the loading state through `[loading]`, not through your own spinner in the content
- An icon-only button needs an `aria-label`
- A blocked link gets `aria-disabled` and swallows the click, since `<a>` has no `disabled` attribute

### Text

Typography goes through `appUiText` with a variant:

```html
<h1 appUiText="h1">Notizen</h1>
<p class="mt-2" appUiText="lead">Kurze Einleitung zur Seite.</p>
<ul appUiText="list">
  <li>Eintrag</li>
</ul>
```

Variants: `display`, `section`, `title`, `page`, `heading`, `h1`, `h2`, `h3`, `h4`, `p`, `lead`, `large`, `small`, `muted`, `code`, `blockquote`, `list`.

`display`, `section` and `title` are large sizes for landing pages, e.g. in `portfolio-web` the name in the hero, the section headings and the project titles. They scale with the viewport through `clamp()`.

`page` and `heading` are for work pages behind the login, which stay calm: `page` is the title of the page (the heading font, smaller than `h1`), `heading` a section in it (the body font, semibold).

The element decides the semantics, the variant only the look. An `h2` may look like an `h3` when the page outline needs it. Classes on the element win over the variant.

### Icon

```html
<app-ui-icon name="plus" /> <app-ui-icon name="trash" label="Löschen" />
```

- Icons are decorative by default and hidden from assistive technology. Pass `label` when the icon carries meaning on its own
- The size follows the font size of the context, so `class="text-2xl"` makes it larger
- Only icons from the registry can be used. `name` is typed as `UiIconName`

To add an icon, register it in [icon/ui-icons.ts](../../packages/shared/ui/src/ui/icon/ui-icons.ts). The key is the name:

```ts
export const UI_ICONS = {
  check: lucideCheck,
  plus: lucidePlus,
  trash: lucideTrash2,
  // ...
} as const;
```

Swapping the icon set only touches this file.

### Spinner and skeleton

```html
<app-ui-spinner label="Notiz wird geladen" />

<div aria-hidden="true">
  <div class="h-8 w-1/3" appUiSkeleton></div>
  <div class="h-24" appUiSkeleton></div>
</div>
```

The spinner is sized by its font size and announced through `label`. A skeleton gets its size from classes, and the group of skeletons is hidden from assistive technology.

For the loading state of data you rarely need either directly: `app-async-content` renders them for an `AsyncState`. See [Error handling](error-handling.md#app-async-content).

### Card

```html
<article appUiCard>
  <div appUiCardHeader>
    <h2 appUiCardTitle>Einkauf</h2>
    <p appUiCardDescription>Geändert am 12.01.2026</p>
  </div>
  <p appUiCardContent>Milch, Brot</p>
  <div appUiCardFooter>
    <a appUiButton variant="outline" size="sm" routerLink="edit">Bearbeiten</a>
  </div>
</article>
```

Import all parts through `UiCardImports`. The card works on any element. Put `appUiCardTitle` on the heading level that fits the page outline.

### Alert

```html
<app-ui-alert heading="Speichern fehlgeschlagen" variant="destructive">
  Der Server ist nicht erreichbar.
  <button appUiAlertAction appUiButton variant="outline" size="sm" type="button">
    Erneut versuchen
  </button>
</app-ui-alert>
```

`variant` is `default` or `destructive`. The projected content is the description, an optional `appUiAlertAction` button sits in the corner (import `UiAlertAction` for it).

The heading of an alert is a heading of level 2 in the page outline (`role="heading"`, `aria-level`). Inside a section with an `h2`, set `[headingLevel]="3"`, so the alert does not read as a section of its own. `app-failure-alert` passes `headingLevel` on, `app-async-content` has `failureHeadingLevel` for its failure.

To show a `Failure`, use `app-failure-alert` instead. It builds on this wrapper.

### Empty

```html
<app-ui-empty
  icon="notebookPen"
  heading="Noch keine Notizen"
  description="Lege deine erste Notiz an, um loszulegen."
>
  <a appUiButton routerLink="new">Neue Notiz</a>
</app-ui-empty>
```

The projected content is the action that gets the user out of the empty state. `headingLevel` (default 2) sets the level of the heading in the page outline.

### Attachment

```html
<div appUiAttachmentGroup role="list">
  @for (image of note.images; track image.id; let index = $index) {
  <app-ui-attachment
    role="listitem"
    orientation="vertical"
    [imageSrc]="image.url"
    [imageAlt]="'noteDetail.images.alt' | t: { number: index + 1 }"
    [href]="image.url"
    [linkLabel]="'noteDetail.images.open' | t: { number: index + 1 }"
  />
  }
</div>

<app-ui-attachment
  title="bericht.pdf"
  description="1,2 MB"
  removable
  removeLabel="Entfernen: bericht.pdf"
  (remove)="remove()"
/>
```

A file or an image as a tile. Import `UiAttachmentImports`.

| Input                      | Values                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `imageSrc`, `imageAlt`     | Preview image. Without `imageSrc` the tile shows `icon` (default `file`)      |
| `title`, `description`     | Name of the file and a muted line below it, e.g. the size                     |
| `href`, `linkLabel`        | Make the whole tile a link that opens in a new tab                            |
| `removable`, `removeLabel` | Show a remove button that emits `remove`                                      |
| `orientation`              | `horizontal` (default) or `vertical`, a square preview with the text below it |
| `state`                    | `done` (default), `idle`, `uploading`, `processing`, `error`                  |

- The link and the remove button have no visible text, so `linkLabel` and `removeLabel` are needed whenever they are shown
- `appUiAttachmentGroup` lays tiles out in a row that scrolls sideways. Give it `role="list"` and the tiles `role="listitem"`
- To let the user choose files, use `app-form-files`, see [Forms](forms.md#formfiles)

### Rich text

```html
<app-ui-rich-text [html]="note.description" /> <app-ui-rich-text [html]="html" profile="page" />
```

Shows rich text that was written with `app-form-rich-text` and stored as HTML. Stored HTML is untrusted: anyone can send it to the API without going through the editor. The wrapper therefore reduces it to the formats listed in [rich-text-rules.ts](../../packages/contracts/src/rich-text.ts) before it is rendered:

- unknown elements lose their tag, scripts, styles, frames and embedded content are removed with what is inside
- every attribute is removed, so stored HTML cannot use the classes of the app or carry an event handler
- a link keeps its `href` only for `http://`, `https://` and `mailto:`, and gets a fixed `target="_blank"` and `rel`, so it opens in a new tab without access to the opener

The result is bound to `innerHTML`, where Angular's sanitizer runs as well. Never bind stored HTML to `innerHTML` yourself, and never call `bypassSecurityTrust*`, which ESLint forbids.

The typography lives in [\_rich-text.scss](../../packages/shared/styles/base/_rich-text.scss) as the global class `.rich-text`, because rendered HTML carries no component scope. The editor uses the same class, so a text looks the same while it is written and when it is shown.

This is one of three layers. The backend sanitizes the HTML too when a note is saved. A Content Security Policy as the third layer is not set up yet.

- the profile `page` (default `text`) is for pages of this site such as the legal pages: it also keeps paths of the site (`/privacy`, `/#contact`, never `//`) and `tel:` links. Both open in the same tab, a plain click on a path goes through the router instead of loading the page again

### Menu

```html
<button [appUiMenuTrigger]="menu" appUiButton variant="outline" type="button" align="end">
  Aktionen
</button>

<ng-template #menu>
  <app-ui-menu class="w-40">
    <app-ui-menu-group>
      <button (triggered)="_edit()" appUiMenuItem type="button">Bearbeiten</button>
      <button (triggered)="_remove()" appUiMenuItem variant="destructive" type="button">
        Löschen
      </button>
    </app-ui-menu-group>
  </app-ui-menu>
</ng-template>
```

- The trigger takes `align` and `side` for the placement of the panel
- Listen to `(triggered)` on items instead of `(click)`, so keyboard activation is covered
- A focused item gets a solid ring in `--ring`, the pale background of the helm item alone is too faint to see
- An item may open a dialog: when it closes, the focus goes back to the trigger of the menu, since the item is gone by then (`focusReturnTarget()` in `ui/dialog/focus-return.ts`, used by `UiDialogService` and `UiConfirmDialogService`)
- `appUiMenuRadio` is a single-choice item with a check mark: `[checked]` marks the current choice. Radio items need an `app-ui-menu-group` around them. The theme toggle uses it, see [theme-toggle.html](../../packages/shared/ui/src/theme-toggle/theme-toggle.html)

### Nav menu

A navigation built from a list of items. An item with `children` becomes a group: a dropdown in the horizontal bar, a collapsible section in the vertical list.

```ts
private readonly _items: UiNavMenuItem[] = [
  { path: '/notes', labelKey: 'layout.nav.notes' },
  {
    labelKey: 'layout.nav.showcase',
    children: [
      { path: '/showcase', labelKey: 'layout.nav.showcaseOverview', exact: true },
      { path: '/showcase/forms', labelKey: 'layout.nav.showcaseForms' },
    ],
  },
];
```

```html
<app-ui-nav-menu [items]="_items" [label]="'layout.mainNavigation' | t" />

<!-- Stacked, e.g. inside an app-ui-sheet -->
<app-ui-nav-menu [items]="_items" [label]="'layout.mainNavigation' | t" orientation="vertical" />
```

- `label` is the accessible name of the `<nav>` landmark
- Labels are translation keys, the wrapper translates them
- The link of the current page gets `aria-current="page"`. A link matches its path and everything below it, `exact: true` limits it to exactly its path. Use it for an overview above its sub pages
- Horizontal: a group opens on click, Enter or Space and closes on Escape, on a click outside and after choosing a link. A group that contains the current page is highlighted
- Vertical: a group is a button that expands its links below it. The group of the current page starts expanded
- Groups nest one level. A group has no page of its own, put an overview link first instead
- It is built on Spartan's `navigation-menu`, not on `menubar`. A menubar is an application menu (`role="menubar"`, "File / Edit"), a site navigation is a list of links and disclosure buttons
- The vertical list uses `collapsible` and not the vertical mode of `navigation-menu`, which opens its panels to the side and does not fit a narrow drawer

Header and drawer both use it with `APP_NAV_ITEMS`, see [app-header.html](../../apps/angular-base/src/app/layout/app-header/app-header.html) and [app-drawer.html](../../apps/angular-base/src/app/layout/app-drawer/app-drawer.html).

- `fragment` links to a section of a page, e.g. `{ path: '/', fragment: 'projects', labelKey: '...' }` for `/#projects`. Such a link is never marked as current, all sections share the path of their page. The section needs an `id`, and `tabindex="-1"` so the shell can move focus to it after the jump

### Breadcrumb

Where the current page sits: a trail of links from the top level down to it. The admin area of `portfolio-web` uses it on every page below the hub instead of a "back" link.

```ts
private readonly _breadcrumb: UiBreadcrumbItem[] = [
  { labelKey: 'admin.areas.hub', path: '/admin' },
  { labelKey: 'admin.areas.portfolio', path: '/admin/portfolio' },
  { labelKey: 'portfolioEditor.sections.hero' },
];
```

```html
<app-ui-breadcrumb [items]="_breadcrumb" />
```

- Labels are translation keys, the wrapper translates them. A label that depends on the page (a section, a legal page) goes into a `computed`
- A label that comes from data, such as the title of an event, is a `label` (text as it is) instead of a `labelKey`: `{ label: event.title, path: '/events/' + event.id }`. An item has exactly one of the two
- Every item but the last is a link through the router. The last item is the current page: no link, `aria-current="page"`, even if it has a `path`
- The `<nav>` is named "Navigationspfad" (`common.breadcrumb`), `label` overrides it. The separators are hidden from screen readers
- Built on Spartan's `breadcrumb`. The list wraps on narrow screens, there is no collapsing into an ellipsis

### Sheet

A panel that slides in from an edge of the screen and covers the page as a modal dialog. Use it for a mobile navigation or a filter:

```html
<button (click)="_filterOpen.set(true)" appUiButton variant="outline" type="button">Filter</button>

<app-ui-sheet [(open)]="_filterOpen" heading="Filter" side="right">
  <app-form-select [formField]="filterForm.status" label="Status" />
</app-ui-sheet>
```

- `open` is two-way bound to a signal. Escape, a click outside and the close button set it back to `false`
- `heading` is shown at the top and becomes the accessible name of the dialog
- `side` is `top`, `right` (default), `bottom` or `left`
- `fullWidth` lets a panel on the left or right cover the whole width below `sm`. Without it the panel takes 3/4 of the width there
- `hideHeading` hides the heading visually, it stays the accessible name. Use it with own content in the header, projected via `appUiSheetHeader`. The mobile drawer shows the logo this way, see [app-drawer.html](../../apps/angular-base/src/app/layout/app-drawer/app-drawer.html)
- Focus is trapped inside while it is open and returns to the triggering element afterwards

The mobile navigation uses it, see [app-drawer.html](../../apps/angular-base/src/app/layout/app-drawer/app-drawer.html).

- `(closed)` emits once the panel is gone and the page scrolls again. While it is open the page is locked, so the router cannot scroll to a section. The drawer waits for this before it jumps to the section of a link, see [app-drawer.ts](../../apps/portfolio-web/src/app/layout/app-drawer/app-drawer.ts)

### Dialog

A dialog is a component that `UiDialogService.open()` opens. The component builds its content with `app-ui-dialog`, reads its input with `injectUiDialogData()` and closes itself through `injectUiDialogRef()`.

Opening:

```ts
private readonly _dialog = inject(UiDialogService);

private async _openDialog(): Promise<void> {
  const name = await this._dialog.open<string, string>(ExampleDialog, { data: 'Ada' }).closed;
  // `undefined` when the dialog was dismissed without a result
}
```

The dialog component:

[apps/angular-base/src/app/features/showcase/presentation/components/example-dialog/example-dialog.ts](../../apps/angular-base/src/app/features/showcase/presentation/components/example-dialog/example-dialog.ts)

```ts
export class ExampleDialog {
  private readonly _dialogRef = injectUiDialogRef<string>();

  private readonly _model = signal({ name: injectUiDialogData<string>() });
  // ...
  private _save(event: Event): void {
    // ...
    this._dialogRef.close(this._model().name);
  }
}
```

```html
<form (submit)="_save($event)">
  <app-ui-dialog heading="Name ändern" description="Der Name wird als Ergebnis zurückgegeben.">
    <app-form-text [formField]="_nameForm.name" label="Name" autocomplete="off" />
    <div appUiDialogFooter>
      <button (click)="_dialogRef.close()" appUiButton variant="outline" type="button">
        Abbrechen
      </button>
      <button appUiButton type="submit">Übernehmen</button>
    </div>
  </app-ui-dialog>
</form>
```

- `open<TResult, TData>(component, { data, closeButton })` returns a `UiDialogRef` with `close(result)` and the promise `closed`
- `heading` and `description` of `app-ui-dialog` become the accessible name and description of the dialog
- The primary action goes last in `appUiDialogFooter`
- `closeButton: false` hides the close button in the corner. Escape and a click outside still close
- The spec of a dialog component renders it with `TestBed.createComponent()` and `providers: provideUiDialogTesting({ data, close })` from `@shared/testing/dialog-testing`, so the spec does not import Spartan (which an app may not)

### Confirm dialog

Yes/no questions go through `UiConfirmDialogService.confirm()`, not through a dialog of your own:

[apps/angular-base/src/app/features/notes/presentation/note-delete-button/note-delete-button.ts](../../apps/angular-base/src/app/features/notes/presentation/note-delete-button/note-delete-button.ts)

```ts
const confirmed = await this._confirmDialog.confirm({
  heading: 'Notiz löschen?',
  description: `„${this.title()}“ wird dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.`,
  confirmLabel: 'Löschen',
  variant: 'destructive',
});
if (confirmed) {
  this.confirmed.emit();
}
```

It resolves to `true` only when the confirming button was used. Escape and "Abbrechen" resolve to `false`, a click outside does not close it. Focus starts on "Abbrechen" and returns to the triggering element afterwards. Use `variant: 'destructive'` for actions that cannot be undone.

### Toast

Short, self-dismissing feedback after an action:

```ts
private readonly _toast = inject(UiToastService);

this._toast.success('Notiz gespeichert');
this._toast.info('Entwurf wiederhergestellt', { position: 'bottom-center' });
```

Methods: `success`, `info`, `warning`, `error`. Options: `description` for a second line, `position` to override the default corner (top right).

An error stays until it is closed. Every message is also written into two live regions of the toaster, `role="status"` for confirmations and `role="alert"` for errors, so screen readers hear it even when the toast vanishes. The same text twice in a row is announced twice.

`app-ui-toaster` is the outlet. It is placed exactly once, in [app.html](../../apps/angular-base/src/app/app.html) next to the outermost router outlet, bound to the resolved theme.

A failure the user has to act on does not belong in a toast. It stays on screen in an `app-failure-alert`. See [Error handling](error-handling.md#showing-failures).

### Toggle group

A row of buttons of which exactly one is selected, outside a form. In a Signal Form use `app-form-toggle-group`.

```html
<app-ui-toggle-group
  [(value)]="_multiplier"
  [options]="_multipliers"
  ariaLabel="Multiplikator"
  variant="brand"
  fullWidth
/>
```

- `options` are `{ value, label, disabled? }`, generic over the value type
- `value` is two-way bound. Clicking the selected option again keeps it, so the value never becomes `null` by a click
- `variant` is `default`, `outline` (the selected option in ink, so it stays visible on a white or muted ground) or `brand` (the selected option in the brand color of the app)
- `fullWidth` lets the options share the width; the app sets their height through `--ui-toggle-group-item-height`
- The group needs an accessible name: `ariaLabel`, or `ariaLabelledby` with the id of a visible heading

### QR code

A QR code as an SVG: sharp in print and rendered the same on the server and in the browser. The library `qrcode` is imported only here, like Spartan (ESLint bans it for apps and `core`).

```html
<app-ui-qr-code [value]="standUrl" label="QR-Code der Upload-Seite" />
```

- `label` is required: the SVG is an image with that name
- It is as wide as its container and draws black on white in every theme, with the quiet zone of four modules scanners need: light modules on a dark ground do not scan everywhere
- `errorCorrection` is `M` (about 15 % may be damaged) by default, `L`, `Q` and `H` are the others

### List

Rows with dividers in a calm frame, for lists on work pages (guests, members, accounts). The semantics stay native: `ul` or `ol` with `li`, what goes into a row is up to the page.

```html
<ul appUiList>
  @for (guest of guests(); track guest.id) {
  <li appUiListItem>{{ guest.name }}</li>
  }
</ul>
```

### Pagination

Pages of a long list as links. The page lives in a query parameter of the current route (`page` by default, page 1 without one), so the back button and a shared address keep it. The page reads it through component input binding, slices its list and passes the numbers in. Hidden while there is only one page.

```html
<app-ui-pagination [page]="_page()" [pageCount]="_pageCount()" label="Seiten der Gästeliste" />
```

- `label` names the navigation, so two on one page stay apart
- The first and last page, the current one and its neighbours are links, the rest a gap, at most seven entries so it fits a phone
- A filter that changes the list sets the page back to 1 by removing the parameter, `queryParamsHandling: 'merge'` keeps the other parameters

### Tab nav

Tabs between the pages of one thing, e.g. overview, guests and team of an event. Each tab is a link, the current one gets `aria-current="page"` and an ink line (bold text, 3px line). On a phone the row scrolls sideways.

```html
<app-ui-tab-nav [items]="_tabs()" label="Bereiche des Events" />
```

- `items` are `{ labelKey, path, exact? }`, `exact` for a tab whose path is the start of the others (the overview)
- `label` names the navigation
- The page below the tabs is the child route of the page that holds them, so the tabs stay while the user switches

## Adding a wrapper

1. Check whether the Helm component exists in `packages/shared/helm-vega`. If not, generate it with the Spartan CLI (configured in [components.json](../../components.json)): `pnpm nx g @spartan-ng/cli:ui <name> --angularCli=true --directory=packages/shared/helm-vega`. `--angularCli` keeps it a folder of the lib instead of a project of its own. Remove the path the CLI adds to `tsconfig.base.json`, the wildcard `@spartan-ng/helm/*` covers it. Every other style lib needs the component too, generated the same way with that lib's style
2. Create `packages/shared/ui/src/ui/<name>/`. A component gets `name.ts`, `name.html` and `name.scss`. A directive without a template is a single `name.ts`
3. Follow the naming scheme: class `Ui<Name>`, selector `app-ui-<name>` or `appUi<Name>`
4. Keep it thin. Where the wrapper adds nothing but a name, set the Helm directive through `hostDirectives` and pass through only the inputs that are needed:

   ```ts
   @Directive({
     selector: 'button[appUiMenuItem]',
     hostDirectives: [{ directive: HlmDropdownMenuItem, inputs: ['disabled', 'variant'] }],
   })
   export class UiMenuItem {}
   ```

5. Define your own types for inputs (`UiButtonVariant`). No Spartan type in the public API
6. Write the JSDoc in English: one sentence on the purpose and an `@example` with the usage (a template snippet, TypeScript for services). Inputs whose meaning is not obvious get their own comment line
7. Add an entry on the showcase page [components.html](../../apps/angular-base/src/app/features/showcase/presentation/components/components.html)
8. Add the wrapper to the list in [CLAUDE.md](../../CLAUDE.md)

## Rules in short

- Spartan, `@ng-icons` and Tiptap are imported in `shared/ui` and `shared/form-controls` only
- Typography through `appUiText`, icons through `app-ui-icon`
- Button loading state through `[loading]`
- Dialogs through `UiDialogService`, yes/no questions through `UiConfirmDialogService`
- Toasts for confirmations, `app-failure-alert` for failures
- Stored rich text through `app-ui-rich-text` only
- Every wrapper has JSDoc with an example and an entry in the showcase
