# Testing

Tests are written with vitest and supertest. They send real HTTP requests to the Express app and use a real Postgres database, so they cover routing, validation, sessions, queries and file handling together.

## Running

Postgres must be running (`docker compose up -d`). Then:

```bash
pnpm nx run-many -t test -p express-api-base server-auth
```

The tests of auth, admin and account links live in `server-auth`, those of notes and the docs in the app. The unit tests of the helpers in `server-core`, such as `sanitizeRichText()`, need no database: `pnpm nx run server-core:test`. To run one file or watch for changes, from the folder of the project:

```bash
cd apps/express-api-base
pnpm exec vitest run src/features/notes/notes.test.ts
pnpm exec vitest
```

## How the test environment is set up

- **Separate database:** tests use `express_api_base_test` (`server-auth` uses `server_auth_test`) in the same Postgres container, never your development data. Each project has its own, because Nx runs the tests of several projects at the same time. It is created automatically on the first run and migrated before every run ([`packages/server/core/src/testing/global-setup.ts`](../../packages/server/core/src/testing/global-setup.ts)). To use another database, set `TEST_DATABASE_URL` (`TEST_DATABASE_URL_SERVER_AUTH` for the lib). `server-auth` migrates with its own migrations in `packages/server/auth/drizzle/`, which contain only the auth tables.
- **Separate config:** [`apps/express-api-base/config/test.json`](../../apps/express-api-base/config/test.json) uses small limits (1 MB per file, 3 images per note, 200 px width) so limits can be tested with tiny files, and stores uploads in `uploads/test`.
- **Clean state per test:** before each test all users, notes, images, sessions and account links are deleted and the test uploads folder is emptied ([`apps/express-api-base/src/test/setup.ts`](../../apps/express-api-base/src/test/setup.ts)). Tests therefore do not depend on each other.
- **No parallel files:** test files run one after another because they share the database.

The environment variables for tests are set in [`apps/express-api-base/vitest.config.ts`](../../apps/express-api-base/vitest.config.ts); your `.env` is not used.

## Writing a test

[`apps/express-api-base/src/test/helpers.ts`](../../apps/express-api-base/src/test/helpers.ts) provides the app and signed-in clients. They wrap the helpers from [`packages/server/auth/src/testing/helpers.ts`](../../packages/server/auth/src/testing/helpers.ts), which take the app as their first argument:

```ts
import { describe, expect, it } from 'vitest';
import { signedUpAgent } from '../../test/helpers.js';

describe('notes', () => {
  it('creates a note', async () => {
    const agent = await signedUpAgent('ada@example.com');

    const res = await agent.post('/notes').send({ title: 'First' }).expect(201);

    expect(res.body.note.title).toBe('First');
  });
});
```

`signedUpAgent()` signs up a new user and returns a supertest agent that keeps the session cookie. Create two agents to test that one user cannot reach another user's data.

`adminAgent()` creates the admin from `apps/express-api-base/config/test.json`, as the server does at startup, and returns an agent signed in as that admin.

Test files live next to the code they test and end in `.test.ts`.

## What is covered

- **Auth** (`server-auth`): sign-up, optional name, duplicate email, invalid input, sign-in with right and wrong credentials, sign-out, missing session, foreign origin.
- **Account links** (`server-auth`): creating, listing and revoking as admin, admin-only access, the public read with one 404 for every bad token, accepting with and without a name, sign-up closed, the 409 for a taken email that leaves the link open, one account for two parallel requests, the token masking of the request log.
- **Admin** (`server-auth`): creating the first admin, access for admins only, listing users, granting and removing admin rights, the block on changing the own account, deleting a user with sessions, the cleanup hooks of features, revoking sessions.
- **Notes** (app): CRUD, sanitizing, validation, missing session, isolation between two users (notes and images), image processing and file cleanup, the all-or-nothing upload, upload limits, removing notes and files when an admin deletes the user.
- **Docs:** the API reference is served, every existing route is documented and every documented route exists, and real responses match the documented shapes.

The docs tests mean that adding an endpoint without documenting it fails the suite. When you add a feature, add its router to the list in [`apps/express-api-base/src/features/docs/docs.test.ts`](../../apps/express-api-base/src/features/docs/docs.test.ts).
