# Workspace

The repository is an [Nx](https://nx.dev) workspace with pnpm. Apps live in `apps/`, the libs they share in `packages/`. Every task runs through Nx (`pnpm nx …`), which caches results and knows which projects a change affects. How to start everything locally is in the [README](../README.md).

## Projects

| Project               | Folder                         | Kind        | Tags                               | Page                                               |
| --------------------- | ------------------------------ | ----------- | ---------------------------------- | -------------------------------------------------- |
| `angular-base`        | `apps/angular-base`            | Angular app | `type:app`, `scope:base`           | [angular-base](apps/angular-base.md)               |
| `express-api-base`    | `apps/express-api-base`        | Express API | `type:api-app`, `scope:base`       | [express-api-base](apps/express-api-base.md)       |
| `portfolio-web`       | `apps/portfolio-web`           | Angular app | `type:app`, `scope:portfolio`      | [portfolio-web](apps/portfolio-web.md)             |
| `portfolio-api`       | `apps/portfolio-api`           | Express API | `type:api-app`, `scope:portfolio`  | [portfolio-api](apps/portfolio-api.md)             |
| `dartomat-web`        | `apps/dartomat-web`            | Angular app | `type:app`, `scope:dartomat`       | [dartomat-web](apps/dartomat-web.md)               |
| `dartomat-api`        | `apps/dartomat-api`            | Express API | `type:api-app`, `scope:dartomat`   | [dartomat-api](apps/dartomat-api.md)               |
| `core`                | `packages/shared/core`         | Angular lib | `type:core`, `scope:shared`        | [core](libs/core.md)                               |
| `ui`                  | `packages/shared/ui`           | Angular lib | `type:ui`, `scope:shared`          | [ui](libs/ui.md)                                   |
| `styles`              | `packages/shared/styles`       | SCSS        | `type:styles`, `scope:shared`      | [styles](libs/styles.md)                           |
| `helm-vega`           | `packages/shared/helm-vega`    | generated   | `type:helm`, `scope:shared`        | [helm](libs/helm.md)                               |
| `contracts`           | `packages/contracts`           | Zod schemas | `type:contract`, `scope:shared`    | [contracts](libs/contracts.md)                     |
| `server-core`         | `packages/server/core`         | Node lib    | `type:server`, `scope:shared`      | [server-core](libs/server-core.md)                 |
| `server-auth`         | `packages/server/auth`         | Node lib    | `type:server`, `scope:shared`      | [server-auth](libs/server-auth.md)                 |
| `portfolio-contracts` | `packages/portfolio/contracts` | Zod schemas | `type:contract`, `scope:portfolio` | [portfolio-contracts](libs/portfolio-contracts.md) |
| `dartomat-contracts`  | `packages/dartomat/contracts`  | Zod schemas | `type:contract`, `scope:dartomat`  | [dartomat-contracts](libs/dartomat-contracts.md)   |
| `vyte-web`            | `apps/vyte-web`                | Angular app | `type:app`, `scope:vyte`           | [vyte-web](apps/vyte-web.md)                       |
| `vyte-api`            | `apps/vyte-api`                | Express API | `type:api-app`, `scope:vyte`       | [vyte-api](apps/vyte-api.md)                       |
| `vyte-contracts`      | `packages/vyte/contracts`      | Zod schemas | `type:contract`, `scope:vyte`      | [vyte-contracts](libs/vyte-contracts.md)           |

`pnpm nx graph` shows the projects and their dependencies in the browser.

## Boundaries

Two tags per project decide what it may import. `@nx/enforce-module-boundaries` in the root [eslint.config.mjs](../eslint.config.mjs) checks them on every lint.

**Type**: browser and server code never mix.

| Tag             | May depend on                                                       |
| --------------- | ------------------------------------------------------------------- |
| `type:app`      | `type:ui`, `type:core`, `type:styles`, `type:contract`              |
| `type:ui`       | `type:ui`, `type:core`, `type:helm`, `type:styles`, `type:contract` |
| `type:core`     | `type:core`                                                         |
| `type:helm`     | `type:helm`                                                         |
| `type:styles`   | `type:styles`                                                       |
| `type:api-app`  | `type:server`, `type:contract`                                      |
| `type:server`   | `type:server`, `type:contract`                                      |
| `type:contract` | `type:contract`, from npm only `zod`                                |

`type:app` and `type:core` may not import `@spartan-ng/*`, `@ng-icons/*` or `@tiptap/*`, only the `ui` lib does.

**Scope**: shared libs know no product, products do not know each other.

| Scope             | May depend on                     |
| ----------------- | --------------------------------- |
| `scope:shared`    | `scope:shared`                    |
| `scope:base`      | `scope:base`, `scope:shared`      |
| `scope:portfolio` | `scope:portfolio`, `scope:shared` |
| `scope:dartomat`  | `scope:dartomat`, `scope:shared`  |
| `scope:vyte`      | `scope:vyte`, `scope:shared`      |

Inside an app, `no-restricted-imports` rules in its `eslint.config.mjs` add the layer rules of the features, see [Frontend architecture](frontend/architecture.md#how-it-is-enforced). Nx also rejects cycles between projects and relative imports into another project.

## Path aliases

Defined in [tsconfig.base.json](../tsconfig.base.json):

| Alias                    | Points to                                       |
| ------------------------ | ----------------------------------------------- |
| `@core/*`                | `packages/shared/core/src/*`                    |
| `@shared/*`              | `packages/shared/ui/src/*`                      |
| `@spartan-ng/helm/*`     | `packages/shared/helm-vega/*/src/index.ts`      |
| `@contracts/*`           | `packages/contracts/src/*`                      |
| `@server/core/*`         | `packages/server/core/src/*`                    |
| `@server/auth/*`         | `packages/server/auth/src/*`                    |
| `@portfolio/contracts/*` | `packages/portfolio/contracts/src/*`            |
| `@dartomat/contracts/*`  | `packages/dartomat/contracts/src/*`             |
| `@vyte/contracts/*`      | `packages/vyte/contracts/src/*`                 |
| `@features/*`            | `src/app/features/*` of the app that imports it |
| `@api/*`                 | `src/api/*` of the app that imports it          |

`@features/*` and `@api/*` start with `${configDir}`, which TypeScript replaces with the folder of the app's tsconfig. So both Angular apps use the same aliases for their own folders. Inside a lib and inside a feature use relative imports, Nx reports an alias that points into the lib itself.

## Commands

| Command                                         | What it does                                               |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `pnpm nx serve <app>`                           | Dev server of one app                                      |
| `pnpm nx run-many -t serve -p <app> <app>`      | Several dev servers in one terminal                        |
| `pnpm nx build <app>`                           | Production build into `dist/apps/<app>`                    |
| `pnpm nx test <project>`                        | Unit tests of one project with Vitest                      |
| `pnpm nx typecheck <project>`                   | `tsc` over sources and specs (Vitest does not check types) |
| `pnpm nx lint <project>`                        | ESLint                                                     |
| `pnpm nx run-many -t lint typecheck test build` | Everything for every project                               |
| `pnpm nx affected -t lint typecheck test build` | The same, only for the projects a change affects           |
| `pnpm nx show project <project>`                | The targets of a project                                   |
| `pnpm nx graph`                                 | The projects and their dependencies in the browser         |
| `pnpm format:check`, `pnpm format:fix`          | Prettier over the whole repo                               |

Angular apps also have `build -c watch` (a development build that rebuilds on change) and `server` (the built server with `node --watch`), see [angular-base](apps/angular-base.md#running-it). API apps have `start`, `db:generate`, `db:migrate`, `db:studio`, `portfolio-api` also `db:seed`, see [express-api-base](apps/express-api-base.md#running-it).

## Conventions

- **Formatting**: Prettier for TypeScript, HTML, SCSS, JSON and Markdown. Plugins sort imports, template attributes, `package.json` keys and Tailwind classes. Configuration: [.prettierrc](../.prettierrc). `packages/shared/helm-*` is generated code and excluded from Prettier and ESLint
- **Linting**: the root [eslint.config.mjs](../eslint.config.mjs) holds the rules for every project, [eslint.angular.mjs](../eslint.angular.mjs) adds the Angular rules for the Angular projects, each project's `eslint.config.mjs` its own restrictions
- **Tests**: specs sit next to the code. Angular projects run them with Vitest and Analog in jsdom, each project's `src/test-setup.ts` calls `setupTestEnvironment()` from `@core/testing/setup-test-environment`. API projects run them against Postgres, see [Testing](backend/testing.md)
- **Module type**: the workspace is ESM (`"type": "module"`), apps are bundled
- **Editor**: the recommended VS Code extensions are listed in [.vscode/extensions.json](../.vscode/extensions.json)
- **Docs**: when a rule changes in `CLAUDE.md`, the matching page here changes in the same commit

## Adding an Angular app

A new app reuses the libs and brings only what is its own:

1. Generate it with `pnpm nx g @nx/angular:application` and tag it `type:app` plus its scope. Take `project.json`, `vite.config.mts`, `tsconfig*.json` and `eslint.config.mjs` of `angular-base` as the reference, with `packages/shared` in `stylePreprocessorOptions.includePaths` and `implicitDependencies: ["styles"]`
2. In `app.config.ts` set `APP_NAME` and hand `uiI18n` and the app's own shared texts to `provideI18n()`. The app's texts must contain `seo.defaultDescription` and `seo.imageAlt`, which `SeoService` expects
3. Give it its own `src/styles/` with `tailwind.css` (`@source` on its `src` and on `packages/shared`), `styles.scss`, `themes/` (including `--brand`) and fonts, see [Styling](frontend/styling.md)
4. Its `src/test-setup.ts` calls `setupTestEnvironment()` with `APP_NAME` and `provideI18nTesting()`
5. To use another Spartan style than vega, see [helm](libs/helm.md)
6. Add a `Dockerfile`, a release tag `nx1-<app>-v*` and a publish job in `.github/workflows/ci.yml`, as for `angular-base`
7. Add the app to `release.projects` in `nx.json`, give it a `package.json` with `name`, `version` and `private: true` and the target `nx-release-publish` with `nx:noop` in its `project.json`, provide `APP_VERSION` from it in `app.config.ts`, and add its name to the scopes in `commitlint.config.mjs`, see [Releasing](releasing.md)

## Adding an API app

1. Create `apps/<app>/` with `project.json` (tag `type:api-app` plus its scope), `package.json` (`type: module`, `packageManager` and the runtime dependencies, which stay external in the bundle), `tsconfig.json`, `rolldown.config.ts`, `vitest.config.ts`, `drizzle.config.ts`, `eslint.config.mjs` and `Dockerfile`. `apps/express-api-base` is the reference for each of them
2. `src/config/index.ts` calls `extendConfig()` with the keys of the app. `config/*.json` contains the shared keys plus those
3. `src/app.ts` calls `createServer()` with `sessionMiddleware` and the routers of auth, admin and the features. `src/index.ts` runs `seedAdmin()` and `startServer()`
4. `drizzle.config.ts` includes `../../packages/server/auth/src/*.table.ts`, so the first migration of the app creates the auth tables
5. A database of its own: add `CREATE DATABASE <app>;` to [tools/postgres/init-databases.sql](../tools/postgres/init-databases.sql), and run `docker compose exec postgres createdb -U app <app>` once on an existing local volume. The test database needs its own name too (`DATABASE_URL` in `vitest.config.ts`), since Nx runs the tests of several projects at the same time
6. `src/test/helpers.ts` wraps the helpers from `@server/auth/testing/helpers` with the app
7. Add a release tag `nx1-<app>-v*` and a publish job in `.github/workflows/ci.yml`, as for `express-api-base`
8. Add the app to `release.projects` in `nx.json`, set `version` in its `package.json`, add the target `nx-release-publish` with `nx:noop` to its `project.json`, pass it to `createServer({ version })`, and add its name to the scopes in `commitlint.config.mjs`, see [Releasing](releasing.md)

## Adding a lib

1. Put it in `packages/shared/` (Angular), `packages/server/` (Node) or `packages/<product>/` (only one product), with `project.json`, `tsconfig*.json` and `eslint.config.mjs` like the libs next to it
2. Tag it with a type and a scope, add a constraint in the root `eslint.config.mjs` if it is a new type
3. Add its alias to `tsconfig.base.json`, as `@<name>/*` pointing to its `src/*`
4. Give it a `README.md` that links its page in `docs/libs/`
