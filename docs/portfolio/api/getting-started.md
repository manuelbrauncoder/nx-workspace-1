# Getting started

## Prerequisites

- **Node 24** (`node -v`)
- **pnpm** (`corepack enable pnpm`)
- **Docker**, for the local Postgres database

## Setup

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Create your `.env` file:

   ```bash
   cp .env.example .env
   ```

   Then set `SESSION_SECRET` to a random value of at least 32 characters, for example the output of `openssl rand -hex 32`. The other values already match the local setup.

3. Start Postgres:

   ```bash
   docker compose up -d
   ```

   This starts Postgres 18 on port 5432 with user, password and database all set to `app` (see [docker-compose.yml](../docker-compose.yml)).

4. Create the tables:

   ```bash
   pnpm db:migrate
   ```

5. Start the API:

   ```bash
   pnpm dev
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

An admin user is created on the first start, with the email and password from the `admin` section of [`config/development.json`](../config/development.json). Sign in as that user to try the admin endpoints:

```bash
curl -c admin.txt -H 'content-type: application/json' \
  -d '{"email":"admin@mail.dev","password":"dev-admin-password"}' \
  http://localhost:3000/auth/sign-in

curl -b admin.txt http://localhost:3000/admin/users
```

## Scripts

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `pnpm dev`          | Start the API in watch mode                                  |
| `pnpm build`        | Compile to `dist/` (tests excluded)                          |
| `pnpm start`        | Run the compiled API from `dist/`                            |
| `pnpm typecheck`    | Type-check everything, including tests                       |
| `pnpm test`         | Run the test suite, see [Testing](testing.md)                |
| `pnpm lint`         | ESLint                                                       |
| `pnpm format`       | Format all files with Prettier                               |
| `pnpm format:check` | Check the formatting without changing files (used by CI)     |
| `pnpm db:generate`  | Create a migration from changed table files                  |
| `pnpm db:migrate`   | Apply pending migrations to the database from `DATABASE_URL` |
| `pnpm db:studio`    | Browse and edit the database in Drizzle Studio               |

## A note on the two TypeScript versions

`package.json` lists TypeScript twice:

- `@typescript/native` is TypeScript 7. It provides the `tsc` command used by `build` and `typecheck`.
- `typescript` is an alias for TypeScript 6. ESLint's TypeScript plugin needs the programmatic compiler API, which TypeScript 7.0 does not ship.

Once `typescript-eslint` supports TypeScript 7, the alias can be removed and `typescript` can point to version 7 again.

## Next steps

- [Architecture](architecture.md) explains how the code is organized and how to add a feature.
- [Configuration](configuration.md) lists every setting.
