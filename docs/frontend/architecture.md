# Architecture

The app follows a feature-based clean architecture. Every feature is split into the same layers, dependencies point in one direction only, and ESLint fails the build when an import crosses a boundary it should not cross.

## Layers

```text
presentation  →  application  →  domain  →  api
(pages,          (store)         (use case,   (DTO, model, mapper,
 components)                      models)      repository, HTTP)
```

An arrow means "may import from". Nothing points back: the API layer does not know features, the domain does not know the store, the store does not know components.

The point of the split is that each kind of change has one place:

- The backend changes its wire format: only `apps/angular-base/src/api` changes
- A feature needs data from two backends: only its use case changes
- A screen is redesigned: only `presentation` changes

## Folder map

The Angular apps live in an Nx workspace: `apps/angular-base` and `apps/portfolio-web`, which is built the same way (see [Portfolio](../apps/portfolio-web.md)). Everything another app can reuse is a lib in `packages/shared/`, everything specific to one app stays in its folder. The tree below shows `angular-base`.

```text
packages/shared/
├── core/src/                 @core/*: app-wide infrastructure
│   ├── config/               runtime config
│   ├── failure/              the Failure type
│   ├── http/                 HTTP interceptor, status of the server response
│   ├── i18n/                 translations, language, date format
│   ├── log/                  logging
│   ├── seo/                  title, meta tags, canonical URL
│   ├── state/                AsyncState, mutation, patchResource
│   ├── testing/              test setup shared by every project
│   ├── theme/                light and dark mode
│   ├── app-name.ts           the APP_NAME token every app sets
│   └── app-version.ts        the APP_VERSION token, from the app's package.json
├── ui/src/                   @shared/*: UI used by several features
│   ├── async-content/
│   ├── failure-alert/
│   ├── form-controls/
│   ├── i18n/                 shared texts of the UI lib
│   ├── language-toggle/
│   ├── theme-toggle/
│   └── ui/
├── helm-vega/                @spartan-ng/helm/*: Spartan components, style vega
└── styles/                   global SCSS: abstracts, base styles, layout

packages/contracts/src/       @contracts/*: wire format shared with the API apps

apps/angular-base/src/
├── api/                      API layer, one folder per backend resource
│   ├── dto-mapper.ts
│   └── notes/
├── app/
│   ├── i18n/                 shared texts of this app
│   ├── layout/               app shell: header, main, footer, mobile drawer
│   ├── features/
│   │   ├── legal/            imprint, privacy policy, accessibility statement
│   │   ├── notes/            reference feature
│   │   └── showcase/
│   ├── site-owner.ts         operator of the site, for the legal pages
│   ├── app.config.ts
│   └── app.routes.ts
├── server/                   parts of the Express server (SEO routes, config, log)
├── server.ts                 Express entry (SSR, SEO routes, static files)
└── styles/                   Tailwind entry, theme tokens and fonts of this app
```

| Folder                                          | Responsibility                         | Must not know                         |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------- |
| `packages/shared/core/src/`                     | Infrastructure every feature relies on | apps, `ui`, the UI library            |
| `packages/shared/ui/src/`                       | Reusable UI and helpers                | apps                                  |
| `packages/shared/helm-<style>/`                 | Spartan components in one style        | everything else                       |
| `packages/shared/styles/`                       | Global SCSS                            | everything else                       |
| `apps/angular-base/src/app/layout/`             | The frame around every page            | features, `apps/angular-base/src/api` |
| `apps/angular-base/src/app/features/<feature>/` | One vertical slice of the product      | other features                        |
| `apps/angular-base/src/api/<resource>/`         | Talking to the backend                 | features                              |
| `apps/angular-base/src/server/`                 | Parts of the Express server            |                                       |

Features and the API layer still live in the app. They become libs once a second app needs them.

## Inside a feature

```text
features/notes/
├── domain/
│   ├── note.ts               re-exports the models from the API layer
│   └── notes.usecase.ts
├── application/
│   └── notes.store.ts
├── presentation/
│   ├── notes-list/
│   ├── note-detail/
│   ├── note-editor/
│   ├── note-card/
│   └── note-delete-button/
└── notes.routes.ts
```

### `domain/`

The use case of the feature and its models. This is the only place in a feature that imports from `@api/*`.

Models are defined in the API layer and re-exported, so the rest of the feature never names the API layer:

[apps/angular-base/src/app/features/notes/domain/note.ts](../../apps/angular-base/src/app/features/notes/domain/note.ts)

```ts
export { NOTE_TITLE_MAX_LENGTH } from '@api/notes/note';
export type { Note, NoteDraft } from '@api/notes/note';
```

The use case currently passes the repository through. That looks like an empty layer, and it is kept on purpose: it is the seam where a feature combines several repositories or adds rules that are not tied to one endpoint, without the store learning about HTTP.

[apps/angular-base/src/app/features/notes/domain/notes.usecase.ts](../../apps/angular-base/src/app/features/notes/domain/notes.usecase.ts)

```ts
@Service({ autoProvided: false })
export class NotesUseCase {
  private readonly _repository = inject(NotesRepository);

  getAll(): Observable<Note[]> {
    return this._repository.getAll();
  }
  // ...
}
```

The domain layer contains no HTTP. Importing `@angular/common/http` there is a lint error.

### `application/`

The store of the feature. It uses only `domain`, holds the state as signals and exposes every asynchronous operation as an `AsyncState`. See [State management](state-management.md).

### `presentation/`

Pages and components. They use `application` and `domain` and get everything visual from `@shared`. Every component is a folder with three files: `name.ts`, `name.html`, `name.scss`. Inline templates and styles are not used.

### `<feature>.routes.ts`

The routes of the feature and the place where its use case and store are provided. Both are created when the user enters the feature and destroyed when they leave it:

[apps/angular-base/src/app/features/notes/notes.routes.ts](../../apps/angular-base/src/app/features/notes/notes.routes.ts)

```ts
export const notesRoutes: Routes = [
  {
    path: '',
    providers: [NotesUseCase, NotesStore],
    children: [
      {
        path: '',
        pathMatch: 'full',
        // A route title is a translation key, the scope of the page is loaded before it renders.
        title: 'notesList.title',
        canActivate: [loadI18nScope(notesListI18n)],
        loadComponent: () =>
          import('./presentation/notes-list/notes-list').then((m) => m.NotesList),
      },
      // ...
    ],
  },
];
```

Features are lazy loaded from [apps/angular-base/src/app/app.routes.ts](../../apps/angular-base/src/app/app.routes.ts) through `loadChildren`, pages inside a feature through `loadComponent`. Each page brings its own translations, loaded by `loadI18nScope`, see [Internationalization](i18n.md).

A feature does not need every layer. `showcase` and `legal` only render static content, so they consist of `presentation/` and their routes.

## Import rules

| From                        | May import                                         | Must not import                                       |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `presentation`              | own `application` and `domain`, `@core`, `@shared` | `@api`, other features, the UI library                |
| `application`               | own `domain`, `@core`                              | `presentation`, `@api`, other features                |
| `domain`                    | `@api`                                             | `application`, `presentation`, `@angular/common/http` |
| `apps/angular-base/src/api` | `@core`                                            | `@features`                                           |
| `core` lib                  | itself                                             | `@shared`, apps, the UI library                       |
| `ui` lib                    | `@core`, `@spartan-ng/helm/*`, the UI library      | apps                                                  |
| `layout`                    | `@core`, `@shared`, `@features/auth/public-api`    | other `@features`, `@api`, the UI library             |
| everything except `ui`      | `@shared/ui`, `@shared/form-controls`              | `@spartan-ng/*`, `@ng-icons/*`, `@tiptap/*`           |

Two more rules:

- Features never import each other. If two features need the same thing, it moves to `shared` (UI, helpers) or to `apps/angular-base/src/api` (data)
- The one exception is `@features/auth/public-api`. Who is signed in concerns every page, so the auth feature opens exactly that file to the app shell and to other features, see [Authentication](auth.md#public-api)
- `portfolio-web` has a second one for the app shell only: `@features/admin/public-api` with the [message bell](../portfolio/web/admin.md#message-bell) in the header
- Inside a feature use relative imports. Across the boundaries use the aliases `@core/*`, `@shared/*`, `@api/*`
- Inside a lib use relative imports too. Nx reports an alias that points into the lib itself

### How it is enforced

Two mechanisms, both run by `pnpm nx run-many -t lint`.

**Between projects**: Nx tags and `@nx/enforce-module-boundaries` in the root [eslint.config.mjs](../../eslint.config.mjs). Each project carries one tag in its `project.json`:

| Tag             | Projects       | May depend on                                      |
| --------------- | -------------- | -------------------------------------------------- |
| `type:app`      | `angular-base` | `type:ui`, `type:core`, `type:styles`              |
| `type:ui`       | `ui`           | `type:ui`, `type:core`, `type:helm`, `type:styles` |
| `type:core`     | `core`         | `type:core`                                        |
| `type:helm`     | `helm-vega`, … | `type:helm`                                        |
| `type:styles`   | `styles`       | `type:styles`                                      |
| `type:contract` | `contracts`    | `type:contract`, from npm only `zod`               |

`type:app` and `type:ui` may also depend on `type:contract`.

A second tag says which product a project belongs to, so products do not depend on each other:

| Scope                                                                                                                                                      | Projects                                                               | May depend on                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `scope:shared`                                                                                                                                             | the libs in `packages/shared`, `packages/server`, `packages/contracts` | `scope:shared`                    |
| `scope:base`                                                                                                                                               | `angular-base`, `express-api-base`                                     | `scope:base`, `scope:shared`      |
| `scope:portfolio`                                                                                                                                          | `portfolio-web`, `portfolio-api`, `portfolio-contracts`                | `scope:portfolio`, `scope:shared` |
| The API side has its own tags (`type:api-app`, `type:server`), which no browser project may depend on, see [API architecture](../backend/architecture.md). |

`type:app` and `type:core` may not import `@spartan-ng/*`, `@ng-icons/*` or `@tiptap/*` (`bannedExternalImports`). Nx also rejects cycles between projects and relative imports into another project.

**Inside the app**: `no-restricted-imports` rules in [apps/angular-base/eslint.config.mjs](../../apps/angular-base/eslint.config.mjs), one block per folder pattern:

```js
restrictImports(
  ['src/app/features/*/application/**/*.ts'],
  [
    CROSS_FEATURE,
    API_LAYER,
    I18N_LIBRARY,
    { regex: '(^|/)presentation/', message: 'application must not depend on presentation.' },
  ],
),
```

A later block replaces the rule of an earlier one for the files it matches, so each block lists every restriction that applies to its files. Keep that in mind when you add a rule.

## App-wide setup

[apps/angular-base/src/app/app.config.ts](../../apps/angular-base/src/app/app.config.ts) wires the infrastructure from `core`:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_NAME, useValue: 'angular-base' },
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(),
    provideHttpClient(
      withInterceptors([
        languageInterceptor,
        credentialsInterceptor,
        sessionExpiredInterceptor,
        failureInterceptor,
      ]),
    ),
    provideAppConfig(),
    provideAuth(),
    provideI18n({ shared: [uiI18n, appI18n] }),
    provideSeo(),
    provideDeveloperGreeting(),
  ],
};
```

- `APP_NAME` is the name of the app in the header, the footer, the page title and the developer greeting. `core` has no default, every app sets it

- `withComponentInputBinding()` binds route parameters to component inputs, which is how `NoteDetail` receives its `id`
- `withInMemoryScrolling()` starts a new page at the top, restores the scroll position when going back and scrolls to the target of a `#fragment` link
- `failureInterceptor` turns failed requests into a `Failure`, see [Error handling](error-handling.md). A response runs through the list backwards, so it comes last and the others see a `Failure`
- `credentialsInterceptor`, `sessionExpiredInterceptor` and `provideAuth()` belong to [Authentication](auth.md)
- `provideAppConfig()` loads the runtime config before the first render, see [API and runtime config](api-and-config.md)
- `provideI18n()` loads the shared texts of the `ui` lib and of the app before the first render, `languageInterceptor` tells the backend the active language, see [Internationalization](i18n.md)
- `provideSeo()` keeps title and meta tags in step with the active route, see [SEO](seo.md)
- `AppErrorHandler` and `provideDeveloperGreeting()` belong to [Logging](logging.md)

## App shell

Every page is rendered inside the `AppShell` from [apps/angular-base/src/app/layout/](../../apps/angular-base/src/app/layout). It is the parent route of all features:

[apps/angular-base/src/app/app.routes.ts](../../apps/angular-base/src/app/app.routes.ts)

```ts
export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'notes' },
      {
        path: 'notes',
        loadChildren: () => import('./features/notes/notes.routes').then((m) => m.notesRoutes),
      },
      // ...
    ],
  },
];
```

```text
layout/
├── app-shell/        skip link, header, <main> with the router outlet, footer, drawer
├── app-header/       logo, navigation from `md` up, theme toggle, menu button below `md`
├── app-footer/       copyright and the links to the legal pages
├── app-drawer/       logo and navigation for small screens, built on `app-ui-sheet`
├── app-logo/         `apps/angular-base/public/logo.svg` as a link to the start page, used by header and drawer
├── not-found/        page of the `**` route, answers with status 404
└── app-nav-items.ts  the navigation entries of header and drawer, the legal links of the footer
```

By default the shell puts a page into the centered `page-container` with space above and below. A page whose sections run across the full width, like the start page of `portfolio-web`, sets `shellLayout('full-bleed')` from [packages/shared/core/src/layout/shell-layout.ts](../../packages/shared/core/src/layout/shell-layout.ts) in the `data` of its route, next to `routeSeo()`. Child routes take it over.

- The shell is loaded eagerly, since it is visible on every page. The features below it stay lazy
- A page without the frame, e.g. a full-screen login, is a route next to the shell route, not a child of it
- `App` itself only holds the outermost `<router-outlet>` and the toaster, so toasts also work on pages without the shell
- After each client-side navigation the shell closes the drawer and moves focus to `<main>`, so keyboard and screen reader users start at the new content. The focus change does not scroll, the scroll position is up to the router
- To add a navigation entry, add it to `APP_NAV_ITEMS`. Header and drawer both render that list with `app-ui-nav-menu`. An entry with `children` becomes a dropdown in the header and a collapsible section in the drawer
- The shell knows paths, not features. Importing `@features/*` or `@api/*` in `layout` is a lint error. The header shows `app-account-menu` from `@features/auth/public-api`, the one import that is allowed

## Adding a feature

`notes` is the reference for CRUD. A new feature follows the same structure, built from the bottom up:

1. **API layer** in `apps/angular-base/src/api/<resource>/`: DTO, model, mapper, repository. See [API and runtime config](api-and-config.md#adding-an-api-resource)
2. **Domain** in `features/<feature>/domain/`: re-export the models, add the use case with `@Service({ autoProvided: false })`
3. **Store** in `features/<feature>/application/`. See [State management](state-management.md)
4. **Pages and components** in `features/<feature>/presentation/`, built from the wrappers in `@shared`. Each page gets its translations in `i18n/de.json` and `i18n/en.json` and a `<page>.i18n.ts`. See [Internationalization](i18n.md#adding-a-page-scope)
5. **Routes** in `features/<feature>/<feature>.routes.ts`, providing use case and store and loading the scope of each page with `loadI18nScope`
6. **Register** the feature in `apps/angular-base/src/app/app.routes.ts` with `loadChildren`, as a child of the `AppShell` route. Add it to `APP_NAV_ITEMS` if it belongs in the navigation, with its label in the shared texts of the app (`apps/angular-base/src/app/i18n/`)
7. Run `pnpm nx run-many -t lint`. A boundary violation shows up there

## Adding an app

See [Workspace](../workspace.md#adding-an-angular-app).
