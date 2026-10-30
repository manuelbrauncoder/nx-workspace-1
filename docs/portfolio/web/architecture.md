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

- The backend changes its wire format: only `src/api` changes
- A feature needs data from two backends: only its use case changes
- A screen is redesigned: only `presentation` changes

## Folder map

```text
src/
├── api/                      API layer, one folder per backend resource
│   ├── dto-mapper.ts
│   ├── auth/
│   ├── contact/              contact form and the inbox of the admin area
│   ├── media/                uploaded images of the portfolio
│   ├── notes/
│   ├── portfolio/            content of the start page
│   └── users/                accounts, for the admin area
├── app/
│   ├── core/                 app-wide infrastructure
│   │   ├── config/           runtime config
│   │   ├── failure/          the Failure type
│   │   ├── http/             HTTP interceptor, status of the server response
│   │   ├── i18n/             translations, language, date format
│   │   ├── log/              logging
│   │   ├── seo/              title, meta tags, canonical URL
│   │   ├── state/            AsyncState, mutation, patchResource, settled
│   │   └── theme/            light and dark mode
│   ├── shared/               UI and utilities used by several features
│   │   ├── async-content/
│   │   ├── failure-alert/
│   │   ├── form-controls/
│   │   ├── i18n/             translations of the shared scope
│   │   └── ui/
│   ├── layout/               app shell: header, main, footer, mobile drawer
│   ├── features/
│   │   ├── admin/            admin hub, users, contact messages
│   │   ├── auth/             sign-in, sign-up, who is signed in
│   │   ├── legal/            imprint, privacy, accessibility, cookies, read from the backend
│   │   ├── legal-editor/     admin pages that change the legal pages
│   │   ├── notes/            reference feature
│   │   ├── portfolio/        start page, reads its content
│   │   ├── portfolio-editor/ admin pages that change the content of the start page
│   │   └── showcase/
│   ├── app.config.ts
│   └── app.routes.ts
├── server/                   parts of the Express server (SEO routes, config, log)
├── server.ts                 Express entry (SSR, SEO routes, static files)
└── styles/                   global styles and theme tokens
```

| Folder                        | Responsibility                         | Must not know       |
| ----------------------------- | -------------------------------------- | ------------------- |
| `src/app/core/`               | Infrastructure every feature relies on | features, `src/api` |
| `src/app/shared/`             | Reusable UI and helpers                | features, `src/api` |
| `src/app/layout/`             | The frame around every page            | features, `src/api` |
| `src/app/features/<feature>/` | One vertical slice of the product      | other features      |
| `src/api/<resource>/`         | Talking to the backend                 | features            |
| `src/server/`                 | Parts of the Express server            |                     |

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

[src/app/features/notes/domain/note.ts](../src/app/features/notes/domain/note.ts)

```ts
export { NOTE_TITLE_MAX_LENGTH } from '@api/notes/note';
export type { Note, NoteDraft } from '@api/notes/note';
```

The use case currently passes the repository through. That looks like an empty layer, and it is kept on purpose: it is the seam where a feature combines several repositories or adds rules that are not tied to one endpoint, without the store learning about HTTP.

[src/app/features/notes/domain/notes.usecase.ts](../src/app/features/notes/domain/notes.usecase.ts)

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

[src/app/features/notes/notes.routes.ts](../src/app/features/notes/notes.routes.ts)

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

Features are lazy loaded from [src/app/app.routes.ts](../src/app/app.routes.ts) through `loadChildren`, pages inside a feature through `loadComponent`. Each page brings its own translations, loaded by `loadI18nScope`, see [Internationalization](i18n.md).

A feature does not need every layer. `showcase` only renders static content, so it consists of `presentation/` and its routes.

## Import rules

| From                           | May import                                         | Must not import                                       |
| ------------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| `presentation`                 | own `application` and `domain`, `@core`, `@shared` | `@api`, other features, the UI library                |
| `application`                  | own `domain`, `@core`                              | `presentation`, `@api`, other features                |
| `domain`                       | `@api`                                             | `application`, `presentation`, `@angular/common/http` |
| `src/api`                      | `@core`                                            | `@features`                                           |
| `core`, `shared`               | each other                                         | `@features`, `@api`                                   |
| `layout`                       | `@core`, `@shared`, `@features/auth/public-api`    | other `@features`, `@api`, the UI library             |
| everything except the wrappers | `@shared/ui`, `@shared/form-controls`              | `@spartan-ng/*`, `@ng-icons/*`                        |

Two more rules:

- Features never import each other. If two features need the same thing, it moves to `shared` (UI, helpers) or to `src/api` (data)
- The one exception is `@features/auth/public-api`. Who is signed in concerns every page, so the auth feature opens exactly that file to the app shell and to other features, see [Authentication](auth.md#public-api)
- Inside a feature use relative imports. Across the boundaries use the aliases `@core/*`, `@shared/*`, `@api/*`

### How it is enforced

The boundaries are `no-restricted-imports` rules in [eslint.config.js](../eslint.config.js), one block per folder pattern:

```js
restrictImports(
  ['src/app/features/*/application/**/*.ts'],
  [
    CROSS_FEATURE,
    API_LAYER,
    UI_LIBRARY,
    { regex: '(^|/)presentation/', message: 'application must not depend on presentation.' },
  ],
),
```

A later block replaces the rule of an earlier one for the files it matches, so each block lists every restriction that applies to its files. Keep that in mind when you add a rule.

## App-wide setup

[src/app/app.config.ts](../src/app/app.config.ts) wires the infrastructure from `core`:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
    provideI18n(),
    provideSeo(),
    provideDeveloperGreeting(),
  ],
};
```

- `withComponentInputBinding()` binds route parameters to component inputs, which is how `NoteDetail` receives its `id`
- `withInMemoryScrolling()` starts a new page at the top, restores the scroll position when going back and scrolls to the target of a `#fragment` link
- `failureInterceptor` turns failed requests into a `Failure`, see [Error handling](error-handling.md). A response runs through the list backwards, so it comes last and the others see a `Failure`
- `credentialsInterceptor`, `sessionExpiredInterceptor` and `provideAuth()` belong to [Authentication](auth.md)
- `provideAppConfig()` loads the runtime config before the first render, see [API and runtime config](api-and-config.md)
- `provideI18n()` loads the shared translations before the first render, `languageInterceptor` tells the backend the active language, see [Internationalization](i18n.md)
- `provideSeo()` keeps title and meta tags in step with the active route, see [SEO](seo.md)
- `AppErrorHandler` and `provideDeveloperGreeting()` belong to [Logging](logging.md)

## App shell

Every page is rendered inside the `AppShell` from [src/app/layout/](../src/app/layout/). It is the parent route of all features:

[src/app/app.routes.ts](../src/app/app.routes.ts)

```ts
export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('./features/portfolio/portfolio.routes').then((m) => m.portfolioRoutes),
      },
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
├── app-header/       logo, navigation and toggles from `md` up, menu button below `md`, sticks to the top
├── app-footer/       logo, the links to the legal pages
├── app-drawer/       logo, navigation and toggles for small screens, built on `app-ui-sheet`
├── app-logo/         the signpost logo `</MB>` with name and job title, a link to the start page
├── not-found/        page of the `**` route, answers with status 404
└── app-nav-items.ts  the navigation entries of header and drawer, the legal links of the footer
```

By default the shell puts a page into the centered `page-container` with space above and below. A page whose sections run across the full width, like the start page, sets `shellLayout('full-bleed')` from [src/app/core/layout/shell-layout.ts](../src/app/core/layout/shell-layout.ts) in the `data` of its route, next to `routeSeo()`. Child routes take it over.

After a navigation the shell moves focus to `<main>`. For a link to a section (`/#projects`) it focuses the section instead, if it has a `tabindex`. The header sets the offset of the `ViewportScroller` to its own height, so the router stops a jump below the sticky header.

- The shell is loaded eagerly, since it is visible on every page. The features below it stay lazy
- A page without the frame, e.g. a full-screen login, is a route next to the shell route, not a child of it
- `App` itself only holds the outermost `<router-outlet>` and the toaster, so toasts also work on pages without the shell
- After each client-side navigation the shell closes the drawer and moves focus to `<main>`, so keyboard and screen reader users start at the new content. The focus change does not scroll, the scroll position is up to the router
- To add a navigation entry, add it to `APP_NAV_ITEMS`. Header and drawer both render that list with `app-ui-nav-menu`. An entry with `children` becomes a dropdown in the header and a collapsible section in the drawer
- The shell knows paths, not features. Importing `@features/*` or `@api/*` in `layout` is a lint error. The header shows `app-account-menu` from `@features/auth/public-api`, the one import that is allowed

## Adding a feature

`notes` is the reference for CRUD. A new feature follows the same structure, built from the bottom up:

1. **API layer** in `src/api/<resource>/`: DTO, model, mapper, repository. See [API and runtime config](api-and-config.md#adding-an-api-resource)
2. **Domain** in `features/<feature>/domain/`: re-export the models, add the use case with `@Service({ autoProvided: false })`
3. **Store** in `features/<feature>/application/`. See [State management](state-management.md)
4. **Pages and components** in `features/<feature>/presentation/`, built from the wrappers in `@shared`. Each page gets its translations in `i18n/de.json` and `i18n/en.json` and a `<page>.i18n.ts`. See [Internationalization](i18n.md#adding-a-page-scope)
5. **Routes** in `features/<feature>/<feature>.routes.ts`, providing use case and store and loading the scope of each page with `loadI18nScope`
6. **Register** the feature in `src/app/app.routes.ts` with `loadChildren`, as a child of the `AppShell` route. Add it to `APP_NAV_ITEMS` if it belongs in the navigation, with its label in the shared scope
7. Run `pnpm lint`. A boundary violation shows up there
