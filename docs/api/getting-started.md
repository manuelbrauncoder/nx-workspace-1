# Getting started

## Prerequisites

- **Node 24** (`node -v`)
- **pnpm** (`corepack enable pnpm`)
- **Docker**, for the local Postgres database

All commands run from the root of the Nx workspace.

## Setup

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Create your `.env` file:

   ```bash
   cp apps/express-api-base/.env.example apps/express-api-base/.env
   ```

   Then set `SESSION_SECRET` to a random value of at least 32 characters, for example the output of `openssl rand -hex 32`. The other values already match the local setup.

3. Start Postgres:

   ```bash
   docker compose up -d
   ```

   This starts Postgres 18 on port 5432 with user, password and database all set to `app` (see [docker-compose.yml](../../docker-compose.yml)). Every API app of the workspace uses this server, each with a database of its own.

4. Create the tables:

   ```bash
   pnpm nx run express-api-base:db:migrate
   ```

5. Start the API:

   ```bash
   pnpm nx serve express-api-base
   ```

   The server restarts when a source file changes. Check that it is up with `curl http://localhost:3000/health`, which answers `{"status":"ok"}`.

## Trying the API

Open `http://localhost:3000/docs` in a browser. This page lists every endpoint with its request and response shapes, and "Try it out" sends real requests. Sign up first; the session cookie is then sent with every further call from that page.

The same flow with curl, using a cookie jar file:

```bash
# sign up (also signs in)
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse","name":"Ada"}' \
  http://localhost:3000/auth/sign-up

# create a note
curl -b cookies.txt -H 'content-type: application/json' \
  -d '{"title":"Hello","description":"<p>My first note</p>"}' \
  http://localhost:3000/notes

# upload two images to it (replace NOTE_ID with the id from the previous response)
curl -b cookies.txt -F images=@photo1.jpg -F images=@photo2.png \
  http://localhost:3000/notes/NOTE_ID/images
```

An admin user is created on the first start, with the email and password from the `admin` section of [`apps/express-api-base/config/development.json`](../../apps/express-api-base/config/development.json). Sign in as that user to try the admin endpoints:

```bash
curl -c admin.txt -H 'content-type: application/json' \
  -d '{"email":"admin@mail.dev","password":"dev-admin-password"}' \
  http://localhost:3000/auth/sign-in

curl -b admin.txt http://localhost:3000/admin/users
```

## Commands

| Command                                                                                         | What it does                                                           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm nx serve express-api-base`                                                                | Start the API in watch mode (`tsx watch`)                              |
| `pnpm nx build express-api-base`                                                                | Bundle the API with the libs into `dist/apps/express-api-base`         |
| `pnpm nx start express-api-base`                                                                | Build and run the bundle                                               |
| `pnpm nx typecheck express-api-base`                                                            | Type-check everything, including tests                                 |
| `pnpm nx test express-api-base`                                                                 | Run the tests of the app, see [Testing](testing.md)                    |
| `pnpm nx lint express-api-base`                                                                 | ESLint                                                                 |
| `pnpm nx run-many -t lint typecheck test -p express-api-base server-core server-auth contracts` | The same for the app and its libs                                      |
| `pnpm format:fix`, `pnpm format:check`                                                          | Format with Prettier, or only check (used by CI)                       |
| `pnpm nx run express-api-base:db:generate`                                                      | Create a migration from changed table files, including the auth tables |
| `pnpm nx run express-api-base:db:migrate`                                                       | Apply pending migrations to the database from `DATABASE_URL`           |
| `pnpm nx run express-api-base:db:studio`                                                        | Browse and edit the database in Drizzle Studio                         |

The workspace uses TypeScript 6 for everything, since the Angular compiler requires it. The standalone repository used TypeScript 7 for `tsc`.

## Next steps

- [Architecture](architecture.md) explains how the code is organized and how to add a feature.
- [Configuration](configuration.md) lists every setting.
