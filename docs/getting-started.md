# Getting started

How to install the workspace, run `angular-base` locally and use the tooling around it.

The repository is an [Nx](https://nx.dev) workspace. Apps live in `apps/`, the libs they share in `packages/shared/`, see [Architecture](architecture.md#folder-map). Every task runs through Nx, which caches results and knows which projects a change affects.

## Prerequisites

- Node.js 24. [.nvmrc](../.nvmrc) selects the version for `nvm`, `fnm` and the pipeline, `devEngines` in [package.json](../package.json) makes pnpm refuse any other major version
- pnpm. The exact version is pinned in the `packageManager` field of [package.json](../package.json), so `corepack enable` gives you the right one

## Install and run

```bash
pnpm install
pnpm nx serve angular-base
```

`nx serve` runs the Angular dev server and opens the app on <http://localhost:4000>. The port is set in [apps/angular-base/project.json](../apps/angular-base/project.json).

The app is server-side rendered. The dev server runs the Express server from [apps/angular-base/src/server.ts](../apps/angular-base/src/server.ts) as well. The backend is a separate process: the app expects it on `http://localhost:3000` (`apiBaseUrl` in [config/app-config.json](../apps/angular-base/config/app-config.json)), and the backend only accepts browser requests from `http://localhost:4000`. See [API and runtime config](api-and-config.md) and [Authentication](auth.md).

Two routes exist out of the box:

- `/sign-in`, `/sign-up`: authentication against the backend
- `/notes`: the reference feature for CRUD, behind the sign-in.
- `/showcase`: typography, colors, form controls and UI components

## Commands

| Command                                         | What it does                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm nx serve angular-base`                    | Dev server with SSR on port 4000                                                              |
| `pnpm nx build angular-base`                    | Production build into `dist/apps/angular-base` (`browser/` and `server/`)                     |
| `pnpm nx serve-ssr angular-base`                | Builds and runs the built server                                                              |
| `pnpm nx build angular-base -c watch`           | Development build into `dist/apps/angular-base` that rebuilds on change                       |
| `pnpm nx server angular-base`                   | Runs the built server with `node --watch`, restarts after each rebuild. Pairs with `-c watch` |
| `pnpm nx test <project>`                        | Unit tests of one project with Vitest, e.g. `core`, `ui`, `angular-base`                      |
| `pnpm nx run-many -t lint typecheck test`       | Lint, type check and tests of every project                                                   |
| `pnpm nx affected -t lint typecheck test build` | The same, only for the projects a change affects                                              |
| `pnpm nx graph`                                 | The projects and their dependencies in the browser                                            |
| `pnpm format:check`                             | Prettier check over the whole repo                                                            |
| `pnpm format:fix`                               | Prettier write over the whole repo                                                            |

`nx serve` is the quicker loop for UI work, with hot module replacement. `build -c watch` plus `server` runs the built Express server from `server.ts` as in the container, which matters when you work on the server, the SEO routes or the config delivery. Run them in two terminals.

To run the production build the way a container would:

```bash
pnpm nx build angular-base
node dist/apps/angular-base/server/server.mjs
```

The server listens on `PORT`, or on 4000 when the variable is not set.

## Runtime config

The app reads its settings at runtime from `/config/app-config.json`. Locally that file is [config/app-config.json](../apps/angular-base/config/app-config.json), which the build copies into the output:

```json
{
  "apiBaseUrl": "http://localhost:3000",
  "environment": "local",
  "logLevel": "debug",
  "siteUrl": "http://localhost:4000",
  "allowIndexing": false
}
```

The app does not start without a valid file. Details and how to add a value are in [API and runtime config](api-and-config.md#runtime-config).

## Path aliases

Defined in [tsconfig.base.json](../tsconfig.base.json):

| Alias         | Points to                       |
| ------------- | ------------------------------- |
| `@core/*`     | `packages/shared/core/src/*`    |
| `@shared/*`   | `packages/shared/ui/src/*`      |
| `@features/*` | `src/app/features/*` of the app |
| `@api/*`      | `src/api/*` of the app          |

Inside a feature use relative imports. Which alias may be used where is part of the [architecture rules](architecture.md#import-rules).

`@core/*` and `@shared/*` point into libs, `@features/*` and `@api/*` into the app that imports them: their target starts with `${configDir}`, which TypeScript replaces with the folder of the app's tsconfig. So both Angular apps use the same aliases for their own features. Inside a lib use relative imports, Nx reports an alias that points into the lib itself.

The alias `@spartan-ng/helm/*` points into `packages/shared/helm-vega`, the generated Spartan components. Only the `ui` lib imports them, see [UI components](ui-components.md).

## Linting and formatting

- ESLint enforces the architecture boundaries, the `app` selector prefix, template accessibility rules and `no-console`. Configuration: the root [eslint.config.mjs](../eslint.config.mjs) and one `eslint.config.mjs` per project that extends it
- Prettier formats TypeScript, HTML, SCSS, JSON and Markdown. Plugins sort imports, template attributes, `package.json` keys and Tailwind classes, so there is no need to order those by hand. Configuration: [.prettierrc](../.prettierrc)
- `packages/shared/helm-*` is generated code and excluded from Prettier and ESLint

Run `pnpm nx affected -t lint typecheck test build` and `pnpm format:check` before you push.

## Tests

Specs sit next to the file they test as `*.spec.ts` and run with Vitest in jsdom, through Analog's Vite plugin for Angular (`vite.config.mts` per project). Vitest does not check types, so the `typecheck` target runs `tsc` over the specs as well. The `src/test-setup.ts` of each project calls `setupTestEnvironment()` from [setup-test-environment.ts](../packages/shared/core/src/testing/setup-test-environment.ts) with the providers all its tests need. The existing specs show the pattern for each layer, for example [note-dto.mapper.spec.ts](../apps/angular-base/src/api/notes/note-dto.mapper.spec.ts), [notes.repository.spec.ts](../apps/angular-base/src/api/notes/notes.repository.spec.ts), [notes.store.spec.ts](../apps/angular-base/src/app/features/notes/application/notes.store.spec.ts) and [note-editor.spec.ts](../apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.spec.ts). Tests run with the German translations, the spec of a page loads the scope of that page, see [Internationalization](i18n.md#tests).

## Editor

The recommended VS Code extensions are listed in [.vscode/extensions.json](../.vscode/extensions.json): Nx Console, the Angular Language Service, Tailwind CSS IntelliSense, Prettier, ESLint and the Vitest explorer.
