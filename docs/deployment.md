# Deployment

Every app of the workspace is deployed as its own Docker image. The pipeline in [.github/workflows/ci.yml](../.github/workflows/ci.yml) checks every change and builds an image whenever a release tag is pushed.

## Images and release tags

All images go to the GitHub Container Registry under the owner of the repository. Names and release tags carry the prefix `nx1-`, so they never collide with images of other repositories.

| App                | Release tag                   | Image                                  | Port | Dockerfile                                                              |
| ------------------ | ----------------------------- | -------------------------------------- | ---- | ----------------------------------------------------------------------- |
| `angular-base`     | `nx1-angular-base-v1.2.0`     | `ghcr.io/<owner>/nx1-angular-base`     | 4000 | [apps/angular-base/Dockerfile](../apps/angular-base/Dockerfile)         |
| `express-api-base` | `nx1-express-api-base-v1.2.0` | `ghcr.io/<owner>/nx1-express-api-base` | 3000 | [apps/express-api-base/Dockerfile](../apps/express-api-base/Dockerfile) |
| `portfolio-web`    | `nx1-portfolio-web-v1.2.0`    | `ghcr.io/<owner>/nx1-portfolio-web`    | 4000 | [apps/portfolio-web/Dockerfile](../apps/portfolio-web/Dockerfile)       |
| `portfolio-api`    | `nx1-portfolio-api-v1.2.0`    | `ghcr.io/<owner>/nx1-portfolio-api`    | 3000 | [apps/portfolio-api/Dockerfile](../apps/portfolio-api/Dockerfile)       |
| `dartomat-web`     | `nx1-dartomat-web-v1.2.0`     | `ghcr.io/<owner>/nx1-dartomat-web`     | 4000 | [apps/dartomat-web/Dockerfile](../apps/dartomat-web/Dockerfile)         |
| `dartomat-api`     | `nx1-dartomat-api-v1.2.0`     | `ghcr.io/<owner>/nx1-dartomat-api`     | 3000 | [apps/dartomat-api/Dockerfile](../apps/dartomat-api/Dockerfile)         |
| `vyte-web`         | `nx1-vyte-web-v1.2.0`         | `ghcr.io/<owner>/nx1-vyte-web`         | 4000 | [apps/vyte-web/Dockerfile](../apps/vyte-web/Dockerfile)                 |
| `vyte-api`         | `nx1-vyte-api-v1.2.0`         | `ghcr.io/<owner>/nx1-vyte-api`         | 3000 | [apps/vyte-api/Dockerfile](../apps/vyte-api/Dockerfile)                 |

Each release publishes three image tags: the version without the prefix (`:v1.2.0`), `:latest` and `:sha-<short commit>`. Use the version in a stack, so a redeploy never pulls a different version by accident. The version must be `v<major>.<minor>.<patch>`. A pre-release such as `nx1-dartomat-web-v1.3.0-beta.1` fails its publish job before anything is built.

Tags are created by `nx release`, which also raises the version in the app's `package.json` and writes its changelog. How it works and how commit messages decide the version: [Releasing](releasing.md). In short:

```bash
pnpm nx release --dry-run
pnpm nx release
pnpm release:push
```

The apps are released independently, a tag only builds the image of its app.

New packages on GHCR are private and not linked to the repository. Make them public or add the registry with a token (`read:packages`) to the server, e.g. under _Registries_ in Portainer.

## The pipeline

The job `checks` runs on a push to `main`, on every pull request and on a release tag. It skips the release commit `chore(release): publish` on `main`: that commit only changes versions and changelogs, and the run of each of its tags checks the released app on the same commit.

| Step                            | Command                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Install                         | `pnpm install --frozen-lockfile`                                                           |
| Format check                    | `pnpm format:check`                                                                        |
| Commit messages (pull requests) | `pnpm exec commitlint --from <base> --to <head>`                                           |
| Lint, type check, tests, build  | `pnpm nx affected -t lint typecheck test build --parallel=4` (a release tag: only its app) |

- `nx affected` only runs the projects a change touches, compared with the last successful run on `main` (`nrwl/nx-set-shas`). A release tag runs only the projects of its app with `nx run-many -p <app>`, the commit was already checked on `main`. There is no cache between runs: Nx 24 keeps its cache per machine, restoring `.nx/cache` on a new runner is ignored, a shared cache needs a remote cache such as Nx Cloud
- The job starts a Postgres service for the tests of the API projects. Each project creates and migrates its own test database
- The Node version comes from [.nvmrc](../.nvmrc), the pnpm version from `packageManager` in [package.json](../package.json). A new Node major is changed in `.nvmrc`, in `devEngines` in `package.json` and in the base images of the Dockerfiles
- A newer commit on the same branch or pull request cancels the running check, a release is never cancelled

After the checks, the job `publish` derives the app from the release tag (`nx1-<app>-v<major>.<minor>.<patch>`, the app must have a `Dockerfile`), builds `apps/<app>/Dockerfile` from the workspace root and pushes the image. Each app has its own build cache. The step summary of the run shows the pull command and the notes from `apps/<app>/deploy-notes.md` (port, mounts, variables). The workflow passes expressions such as the repository owner to its scripts through `env:`, not inside the script text. Both jobs stop after 20 minutes, and the checkout leaves no token in `.git/config`.

### Dependency updates

[Dependabot](../.github/dependabot.yml) opens pull requests every Monday:

- **GitHub Actions:** one grouped pull request (`ci(deps): …`). Every action in the workflow is pinned to a commit SHA with its version as a comment, `uses: actions/checkout@<sha> # v7.0.1`, so a moved tag cannot change what runs. Dependabot updates the SHA and the comment together. A new action is added the same way, never with a bare tag
- **npm:** minor and patch updates of the root `package.json` as one grouped pull request (`chore(deps): …` or `chore(deps-dev): …`), majors one by one. Majors of Angular and Nx are left out, they go through `pnpm nx migrate`. `@spartan-ng/*` is left out completely, brain and CLI move together with the generated helm components through `tools/scripts/update-spartan.mjs` ([helm](libs/helm.md#updating-spartan)). The skill `update-deps` (`.claude/skills/update-deps/`) walks through both
- commitlint accepts these commits: the scopes `deps` and `deps-dev` are known, and commits signed off by Dependabot are not checked further because their body carries the release notes with long lines

Two limits:

- An update only changes the root `package.json` and `pnpm-lock.yaml`, files of no project. It therefore counts for no app (see [Releasing](releasing.md#which-apps-a-commit-counts-for)) and reaches the images only with the next release of each app
- pnpm 12 writes `pnpm-lock.yaml` as two YAML documents. GitHub's dependency graph does not read that format, so there are no Dependabot alerts or security updates for npm packages, only the weekly version updates. Known vulnerabilities in the running images are reported by the nightly Trivy scan on the server

## Building an image locally

Every Dockerfile is built from the workspace root, since the image needs the shared libs:

```bash
docker build -f apps/portfolio-web/Dockerfile -t nx1-portfolio-web .
```

The build context excludes [`.dockerignore`](../.dockerignore) entries: `.env` files (except `.env.example`), `uploads/`, `apps/*/config/*.local.json` and `apps/*/config/production.json`. Secrets and the real production config therefore never reach a build stage or an image.

The paths inside the images are the same as before the monorepo, so a stack only changes the image name:

| App                | Runs                                                                 | Config inside the container                                         |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `angular-base`     | `node dist/angular-base/server/server.mjs`                           | mounted at `/app/dist/angular-base/browser/config/app-config.json`  |
| `portfolio-web`    | `node dist/portfolio-web/server/server.mjs`                          | mounted at `/app/dist/portfolio-web/browser/config/app-config.json` |
| `express-api-base` | `node dist/index.js`, migrations with `node dist/scripts/migrate.js` | path in `CONFIG_PATH`                                               |
| `portfolio-api`    | the same, plus `node dist/scripts/seed.js` for the initial content   | path in `CONFIG_PATH`                                               |
| `dartomat-web`     | `node dist/dartomat-web/server/server.mjs`                           | mounted at `/app/dist/dartomat-web/browser/config/app-config.json`  |
| `dartomat-api`     | `node dist/index.js`, migrations with `node dist/scripts/migrate.js` | path in `CONFIG_PATH`                                               |
| `vyte-web`         | `node dist/vyte-web/server/server.mjs`                               | mounted at `/app/dist/vyte-web/browser/config/app-config.json`      |
| `vyte-api`         | `node dist/index.js`, migrations with `node dist/scripts/migrate.js` | path in `CONFIG_PATH`                                               |

## Angular apps

An Angular image contains only the build output of the app: the server bundle includes its dependencies, so the image has no `node_modules` and runs as the unprivileged user `node`.

```bash
docker run -p 4000:4000 \
  -e NG_ALLOWED_HOSTS=example.com,www.example.com \
  -e NG_TRUST_PROXY_HEADERS=x-forwarded-proto,x-forwarded-host,x-forwarded-port,x-forwarded-for,x-forwarded-server \
  -v ./app-config.json:/app/dist/angular-base/browser/config/app-config.json:ro \
  ghcr.io/<owner>/nx1-angular-base:v1.2.0
```

| Setting                  | Meaning                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| `PORT`                   | Port the server listens on, 4000 by default                                       |
| the mounted config       | The [runtime config](frontend/api-and-config.md#runtime-config) of the deployment |
| `NG_ALLOWED_HOSTS`       | Host names the app is reached under, separated by commas                          |
| `NG_TRUST_PROXY_HEADERS` | `X-Forwarded-*` headers to accept from a reverse proxy, separated by commas       |

- **Config**: the image contains the local `config/app-config.json` of the app as a placeholder. A deployment mounts its own file with the real `apiBaseUrl` and `siteUrl`. `allowIndexing` is `true` in production only, see [SEO](frontend/seo.md#indexing). `allowSignUp` must match `auth.signUpEnabled` of the API, it is `true` when missing
- **Allowed hosts**: Angular checks the `Host` header of every request against a list and answers with 400 when the host is not on it, which protects against forged host headers. The `project.json` of the app only lists `localhost` (`security.allowedHosts`), the variable adds the hosts of the deployment
- **Proxy headers**: behind a reverse proxy that terminates TLS, e.g. Traefik, the app only knows it is reached over `https` when it may read `x-forwarded-proto`. Angular drops every `X-Forwarded-*` header that is not listed and logs a warning for it on each request. List the headers your proxy sends. The container must then only be reachable through the proxy
- **Requests to itself**: while rendering, the server loads `/config/app-config.json`, and the API as long as `apiBaseUrl` is relative, through the host name of the incoming request. The container therefore has to reach the app under its public host name, and a local test needs the same port outside and inside (`-p 4000:4000`)

## API apps

An API image contains the bundle in `dist/`, only the runtime dependencies of the app (from a lockfile pruned by `nx prune-lockfile`), the migrations in `drizzle/` and, for `portfolio-api`, the initial content in `seed/`. It runs as the unprivileged user `node` (uid 1000), like the Angular images.

### What the server needs

| Item           | Details                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL     | Reachable from the containers; the connection string goes into `DATABASE_URL`                                                                   |
| Config file    | A JSON file on the host, mounted read-only into the container; its path goes into `CONFIG_PATH`                                                 |
| Uploads folder | A host folder or volume mounted at `/app/uploads`, so images survive a redeploy. It must belong to uid 1000: `sudo chown -R 1000:1000 <folder>` |
| Secrets        | `SESSION_SECRET` (at least 32 characters) and the database credentials, as stack variables                                                      |
| Reverse proxy  | Terminates HTTPS and forwards to port 3000                                                                                                      |

`portfolio-api` also needs an SMTP account for forwarding contact messages: host, user and addresses go into `mail` of the config file, the password into `SMTP_PASSWORD`.

Create the config file from `config/production.example.json` of the app ([express-api-base](../apps/express-api-base/config/production.example.json), [portfolio-api](../apps/portfolio-api/config/production.example.json), [dartomat-api](../apps/dartomat-api/config/production.example.json), [vyte-api](../apps/vyte-api/config/production.example.json)). If you keep the real file in a checkout, name it `config/production.json`: git and the Docker build context ignore that name. The shared settings are explained in [Configuration](backend/configuration.md), those of the portfolio in [Portfolio API configuration](portfolio/api/configuration.md). Settings added to the shared libs later have defaults, so the file of an existing deployment stays valid.

### The stack

`docker-compose.prod.example.yml` of each API app ([express-api-base](../apps/express-api-base/docker-compose.prod.example.yml), [portfolio-api](../apps/portfolio-api/docker-compose.prod.example.yml), [dartomat-api](../apps/dartomat-api/docker-compose.prod.example.yml), [vyte-api](../apps/vyte-api/docker-compose.prod.example.yml)) is a template for a Portainer stack behind Traefik. It defines two services:

- **`migrate`** runs `node dist/scripts/migrate.js` and exits. It only gets `DATABASE_URL`
- **`api`** starts only after `migrate` has finished successfully. It gets the config file, the uploads volume and the environment variables

This order guarantees that the API never runs against an outdated schema. If a migration fails, the new API container does not start. Adjust in the template: the image name and tag, the host name in the Traefik rule, the two host paths and the network names.

### Deploying with Portainer

The template expects a Traefik instance on the external network `web` and a Postgres container named `postgres` on the external network `api-network`.

1. **Publish the image** by pushing a release tag. The workflow builds for `linux/amd64`
2. **Give Portainer access to the image**, see [Images and release tags](#images-and-release-tags)
3. **Create the database.** The `migrate` service creates the tables, not the database itself: `CREATE DATABASE ...` once in the existing Postgres
4. **Create the config file and the uploads folder on the host**, at the two paths used under `volumes` in the stack
5. **Create the stack.** _Stacks → Add stack → Web editor_, paste the template and adjust it. Set these under _Environment variables_:

   | Variable            | Value                                                      |
   | ------------------- | ---------------------------------------------------------- |
   | `POSTGRES_USER`     | Database user                                              |
   | `POSTGRES_PASSWORD` | Its password. Avoid `@`, `:` and `/`, it is put into a URL |
   | `POSTGRES_DB`       | Name of the database from step 3                           |
   | `SESSION_SECRET`    | Output of `openssl rand -hex 32`                           |
   | `SMTP_PASSWORD`     | `portfolio-api` only: password of the SMTP account         |

6. **Deploy and check.** The `migrate` container logs `Migrations applied` and stops with exit code 0, that it is shown as stopped afterwards is expected. Then `https://your-api-host/health` answers `{"status":"ok"}`
7. **`portfolio-api`: load the initial content once.** In the running `api` container (Portainer: _Containers → api → Console_), run `node dist/scripts/seed.js`. Running it again only reports `Nothing to seed`

If the `api` container restarts in a loop, its log starts with `Invalid configuration:` followed by the setting or variable that is wrong. The template is for a standalone Docker environment: Swarm stacks ignore `depends_on`, so the API would not wait for the migrations there.

### Go-live checklist

In the production config file:

- [ ] `trustProxy` is `1` (one proxy in front of the API). Without it, signing in fails because the secure cookie is not set
- [ ] `session.secureCookie` is `true`
- [ ] `cors.origins` contains the exact origin of the frontend
- [ ] `auth.signUpEnabled` is `false`, unless visitors should be able to create accounts
- [ ] `docs.enabled` is set deliberately. `true` makes the API reference public at `/docs`, it shows the endpoints, not data
- [ ] `logLevel` is `info`
- [ ] `admin.email` and `admin.password` are set to real values before the first start. The API refuses to start with a placeholder or a password under 16 characters, see [Configuration](backend/configuration.md#the-admin-password)
- [ ] `portfolio-api`: `publicUrl` is the public origin of the API, image URLs are built from it

In the stack:

- [ ] `SESSION_SECRET` is a long random value that is not used anywhere else
- [ ] `NODE_ENV` is `production`
- [ ] The uploads folder is mounted and belongs to uid 1000, the user of the container
- [ ] The config file is mounted and `CONFIG_PATH` points to the path inside the container

On the domain: frontend and API share the same registrable domain (e.g. `app.example.com` and `api.example.com`), see [Authentication](backend/authentication.md#frontend-integration).

### Updating, backups, scaling

- **Updating**: push a new release tag, change the tag for both services in the stack and redeploy. Pending migrations are applied by `migrate` automatically
- **Backups**: the Postgres database and the uploads folder belong together, the database stores which image files exist, the folder the files
- **More than one instance**: uploads are on the local file system and the rate limit counts in memory per instance. Both would need a shared solution first. Sessions are already shared, they are stored in Postgres

## Switching an existing deployment to the workspace images

The portfolio and the base apps ran from images of their former repositories (`ghcr.io/<owner>/portfolio-web`, `portfolio-api`, `angular-base`, `express-api-base`). The workspace images have new names, the rest stays the same:

1. Push the release tag of the app, e.g. `nx1-portfolio-api-v1.0.0`, and give the server access to the new package
2. In the stack, change only the image, e.g. `ghcr.io/<owner>/portfolio-api:v1.4.0` → `ghcr.io/<owner>/nx1-portfolio-api:v1.0.0`. Paths, config mounts, environment variables and ports are unchanged
3. Redeploy. The old packages stay untouched and can be removed once the new images run

## Rules in short

- Run `pnpm format:check` and `pnpm nx affected -t lint typecheck test build` before you push
- A release is a tag `nx1-<app>-v<major>.<minor>.<patch>`, nothing else publishes an image
- No environment-specific value in an image. Everything that differs per deployment is in the mounted config or an environment variable
