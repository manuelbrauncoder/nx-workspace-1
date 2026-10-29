# Getting started

How to install the project, run it locally and use the tooling around it.

## Prerequisites

- Node.js 24. [.nvmrc](../.nvmrc) selects the version for `nvm`, `fnm` and the pipeline, `devEngines` in [package.json](../package.json) makes pnpm refuse any other major version
- pnpm. The exact version is pinned in the `packageManager` field of [package.json](../package.json), so `corepack enable` gives you the right one

## Install and run

```bash
pnpm install
pnpm start
```

`pnpm start` runs `ng serve` and opens the app on <http://localhost:4000>. The port is set in [angular.json](../angular.json).

The app is server-side rendered. The dev server runs the Express server from [src/server.ts](../src/server.ts) as well. The backend is a separate process: the app expects it on `http://localhost:3000` (`apiBaseUrl` in [config/app-config.json](../config/app-config.json)), and the backend only accepts browser requests from `http://localhost:4000`. See [API and runtime config](api-and-config.md) and [Authentication](auth.md).

Two routes exist out of the box:

- `/sign-in`, `/sign-up`: authentication against the backend
- `/notes`: the reference feature for CRUD, behind the sign-in.
- `/showcase`: typography, colors, form controls and UI components

## Scripts

| Script              | What it does                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `pnpm start`        | Dev server with SSR on port 4000                                                   |
| `pnpm build`        | Production build into `dist/angular-base` (`browser/` and `server/`)               |
| `pnpm watch`        | Development build that rebuilds on change                                          |
| `pnpm server`       | Runs the built server with `node --watch`. Needs a build first, pairs with `watch` |
| `pnpm test`         | Unit tests with Vitest                                                             |
| `pnpm lint`         | ESLint over `src/**/*.ts` and `src/**/*.html`                                      |
| `pnpm format:check` | Prettier check over the whole repo                                                 |
| `pnpm format:fix`   | Prettier write over the whole repo                                                 |

To run the production build the way a container would:

```bash
pnpm build
node dist/angular-base/server/server.mjs
```

The server listens on `PORT`, or on 4000 when the variable is not set.

## Runtime config

The app reads its settings at runtime from `/config/app-config.json`. Locally that file is [config/app-config.json](../config/app-config.json), which the build copies into the output:

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

Defined in [tsconfig.json](../tsconfig.json):

| Alias         | Points to            |
| ------------- | -------------------- |
| `@core/*`     | `src/app/core/*`     |
| `@shared/*`   | `src/app/shared/*`   |
| `@features/*` | `src/app/features/*` |
| `@api/*`      | `src/api/*`          |

Inside a feature use relative imports. Which alias may be used where is part of the [architecture rules](architecture.md#import-rules).

The `@spartan-ng/helm/*` aliases point into `libs/ui`, the generated Spartan components. Application code does not import them directly, see [UI components](ui-components.md).

## Linting and formatting

- ESLint enforces the architecture boundaries, the `app` selector prefix, template accessibility rules and `no-console`. Configuration: [eslint.config.js](../eslint.config.js)
- Prettier formats TypeScript, HTML, SCSS, JSON and Markdown. Plugins sort imports, template attributes, `package.json` keys and Tailwind classes, so there is no need to order those by hand. Configuration: [.prettierrc](../.prettierrc)
- `libs/` is generated code and excluded from Prettier

Run `pnpm lint`, `pnpm format:check` and `pnpm test` before you push.

## Tests

Specs sit next to the file they test as `*.spec.ts` and run with Vitest in jsdom through `ng test`. The existing specs show the pattern for each layer, for example [note-dto.mapper.spec.ts](../src/api/notes/note-dto.mapper.spec.ts), [notes.repository.spec.ts](../src/api/notes/notes.repository.spec.ts), [notes.store.spec.ts](../src/app/features/notes/application/notes.store.spec.ts) and [note-editor.spec.ts](../src/app/features/notes/presentation/note-editor/note-editor.spec.ts). Tests run with the German translations, the spec of a page loads the scope of that page, see [Internationalization](i18n.md#tests).

## Editor

The recommended VS Code extensions are listed in [.vscode/extensions.json](../.vscode/extensions.json): the Angular Language Service and Tailwind CSS IntelliSense.
