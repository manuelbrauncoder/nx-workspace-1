# nx1 workspace

A full-stack Nx monorepo that I build and run myself: Angular 22 frontends with server-side rendering, Express 5 APIs on Postgres and the libs they share. Four products live here side by side. One of them is in production: my portfolio at [manuel-braun.net](https://manuel-braun.net/), whose content comes from its own CMS API in this repo.

Everything needed to run it locally is on this page. Architecture, apps, libs and deployment are explained in [docs/](docs/README.md).

## Highlights

- **Architecture enforced by lint**: Nx tags keep the products apart from each other and browser code apart from server code. Inside an app every feature is layered `presentation → application → domain → api`, and ESLint rejects an import against that direction. See [Workspace](docs/workspace.md) and [Frontend architecture](docs/frontend/architecture.md)
- **One wire format**: Zod schemas in `packages/contracts` validate every request in the APIs, the Angular apps import only their types. A test per API fails when a route and its OpenAPI entry drift apart
- **Current Angular**: standalone components without zone.js, signals for all state, Signal Forms with own form controls, SSR with a runtime config instead of build-time environments, German and English at runtime
- **Accessible by default**: WCAG 2.2 AA is a requirement, 44 px touch targets, and 67 component specs run axe through `toBeAccessible()`
- **UI library behind wrappers**: Spartan, Tailwind components and Tiptap are only imported in the lib `ui`. Apps use the `app-ui-*` and `app-form-*` wrappers, so a change of the UI library stays inside one lib
- **Secure APIs**: HTTP-only session cookies, an Origin check against CSRF, rate limits, every query filtered by owner (a foreign resource is a 404), rich text sanitized against one shared allow list, uploaded images re-encoded with a pixel limit
- **Delivery**: CI runs format, lint, typecheck, tests against a real Postgres and build for the affected projects. Each app has its own release tag, changelog and Docker image (non-root), versions come from Conventional Commits through `nx release`. Actions are pinned to commit SHAs, Dependabot keeps them current
- **Working with AI agents**: [CLAUDE.md](CLAUDE.md) is the rule set the agents work from, `.claude/agents/` holds reviewers for accessibility, security and the API conventions. The [docs](docs/README.md) explain the reasoning behind every rule

## What is in here

| App                                               | Kind                                   | Locally                 | Talks to                    |
| ------------------------------------------------- | -------------------------------------- | ----------------------- | --------------------------- |
| [angular-base](docs/apps/angular-base.md)         | Angular 22 with SSR, reference app     | <http://localhost:4000> | `express-api-base`          |
| [express-api-base](docs/apps/express-api-base.md) | Express 5 + Drizzle, reference API     | <http://localhost:3000> | Postgres `express_api_base` |
| [portfolio-web](docs/apps/portfolio-web.md)       | Angular 22 with SSR, portfolio site    | <http://localhost:4100> | `portfolio-api`             |
| [portfolio-api](docs/apps/portfolio-api.md)       | Express 5 + Drizzle, portfolio CMS     | <http://localhost:3100> | Postgres `portfolio_api`    |
| [dartomat-web](docs/apps/dartomat-web.md)         | Angular 22 with SSR, darts scoreboard  | <http://localhost:4200> | `dartomat-api`              |
| [dartomat-api](docs/apps/dartomat-api.md)         | Express 5 + Drizzle, darts games       | <http://localhost:3200> | Postgres `dartomat_api`     |
| [vyte-web](docs/apps/vyte-web.md)                 | Angular 22 with SSR, event invitations | <http://localhost:4300> | `vyte-api`                  |
| [vyte-api](docs/apps/vyte-api.md)                 | Express 5 + Drizzle, events and guests | <http://localhost:3300> | Postgres `vyte_api`         |

The libs live in `packages/`: `core`, `ui`, `styles` and `helm-vega` for Angular, `server-core` and `server-auth` for the APIs, `contracts`, `portfolio-contracts`, `dartomat-contracts` and `vyte-contracts` as the wire format between both. See [Workspace](docs/workspace.md) for the full list with tags and aliases.

## Prerequisites

- **Node 24**, the exact version is in [.nvmrc](.nvmrc) (`nvm use`)
- **pnpm** through Corepack, the version comes from `packageManager` in [package.json](package.json):

  ```bash
  corepack enable
  ```

- **Docker** for the local Postgres

## One-time setup

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Start Postgres. The first start creates the databases `express_api_base`, `portfolio_api`, `dartomat_api` and `vyte_api` from [tools/postgres/init-databases.sql](tools/postgres/init-databases.sql):

   ```bash
   docker compose up -d
   ```

   An existing volume from before keeps its databases. Create a missing one by hand, for example:

   ```bash
   docker compose exec postgres createdb -U app portfolio_api
   ```

3. Give each API its `.env`. Copy the example and set `SESSION_SECRET` to at least 32 characters (`openssl rand -hex 32`). `DATABASE_URL` already matches the compose file:

   ```bash
   cp apps/express-api-base/.env.example apps/express-api-base/.env
   ```

   ```bash
   cp apps/portfolio-api/.env.example apps/portfolio-api/.env
   ```

   ```bash
   cp apps/dartomat-api/.env.example apps/dartomat-api/.env
   ```

   ```bash
   cp apps/vyte-api/.env.example apps/vyte-api/.env
   ```

4. Create the tables:

   ```bash
   pnpm nx run express-api-base:db:migrate
   ```

   ```bash
   pnpm nx run portfolio-api:db:migrate
   ```

   ```bash
   pnpm nx run dartomat-api:db:migrate
   ```

   ```bash
   pnpm nx run vyte-api:db:migrate
   ```

5. Load the initial content of the portfolio (sections and legal pages). Running it again is safe:

   ```bash
   pnpm nx run portfolio-api:db:seed
   ```

## Start developing

One product at a time, API and frontend together in one terminal:

```bash
pnpm nx run-many -t serve -p express-api-base angular-base
```

```bash
pnpm nx run-many -t serve -p portfolio-api portfolio-web
```

```bash
pnpm nx run-many -t serve -p dartomat-api dartomat-web
```

```bash
pnpm nx run-many -t serve -p vyte-api vyte-web
```

The ports differ, so all products can run at the same time. The APIs restart on change (`tsx watch`), the Angular dev servers reload and render on the server as well.

On the first start each API with sign-in (not `dartomat-api`) creates an admin from `admin` in its `config/development.json`: `admin@mail.dev` with the password `dev-admin-password`. Sign in at `/sign-in`, in `portfolio-web` the admin area is at `/admin`.

To run the Angular Express server the way it runs in the container (for work on `src/server.ts`), build and serve in two terminals instead of `serve`:

```bash
pnpm nx build angular-base -c watch
```

```bash
pnpm nx server angular-base
```

The API reference of each API is at `/docs` (<http://localhost:3000/docs>, <http://localhost:3100/docs>).

## Common commands

| Command                                         | What it does                                   |
| ----------------------------------------------- | ---------------------------------------------- |
| `pnpm nx serve <app>`                           | Dev server of one app                          |
| `pnpm nx test <project>`                        | Unit tests with Vitest (APIs need Postgres)    |
| `pnpm nx lint <project>`                        | ESLint including the module boundaries         |
| `pnpm nx typecheck <project>`                   | `tsc` over sources and specs                   |
| `pnpm nx build <app>`                           | Production build into `dist/apps/<app>`        |
| `pnpm nx affected -t lint typecheck test build` | Everything the current change affects          |
| `pnpm nx run-many -t lint typecheck test build` | Everything for every project, as the CI does   |
| `pnpm format:check`, `pnpm format:fix`          | Prettier over the whole repo                   |
| `pnpm nx run <api>:db:generate`                 | New migration after changing a `*.table.ts`    |
| `pnpm nx run <api>:db:studio`                   | Drizzle Studio on the database of the API      |
| `pnpm nx graph`                                 | Projects and their dependencies in the browser |

Before a push run what the CI runs: `pnpm format:check` and `pnpm nx run-many -t lint typecheck test build`.

## Troubleshooting

- **Port already in use**: an older dev server or a test run still holds it. Find it with `lsof -i :3000` and stop it
- **API exits with a config error**: `.env` is missing or `SESSION_SECRET` is shorter than 32 characters
- **`database "…" does not exist`**: the Postgres volume is older than the database. Create it with `createdb` as in step 2
- **Frontend shows a network error**: the matching API is not running, or `apiBaseUrl` in the app's `config/app-config.json` points elsewhere
- **API tests fail at the start**: Postgres is not running. The tests create their own `*_test` databases

## Releases

Commit messages follow Conventional Commits (`feat(dartomat-web): …`, `fix: …`), a hook checks them. `pnpm nx release` derives the next version of each app from them, writes its changelog and tags it `nx1-<app>-v<version>`; pushing the tag builds the Docker image `ghcr.io/<owner>/nx1-<app>`. Details in [Releasing](docs/releasing.md) and [Deployment](docs/deployment.md).

## Further reading

- [docs/README.md](docs/README.md): index of all docs
- [docs/workspace.md](docs/workspace.md): projects, boundaries, aliases, adding an app or a lib
- [CLAUDE.md](CLAUDE.md): the short rule set for code in this repo

## License

[MIT](LICENSE)
