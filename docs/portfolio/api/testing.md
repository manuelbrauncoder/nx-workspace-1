# Testing

Tests are written with vitest and supertest. They send real HTTP requests to the Express app and use a real Postgres database, so they cover routing, validation, sessions, queries and file handling together.

## Running

Postgres must be running (`docker compose up -d`). Then:

```bash
pnpm test
```

To run one file or watch for changes:

```bash
pnpm exec vitest run src/features/notes/notes.test.ts
pnpm exec vitest
```

## How the test environment is set up

- **Separate database:** tests use `app_test` in the same Postgres container, never your development data. It is created automatically on the first run and migrated before every run ([`src/test/global-setup.ts`](../src/test/global-setup.ts)). To use another database, set `TEST_DATABASE_URL`.
- **Separate config:** [`config/test.json`](../config/test.json) uses small limits (1 MB per file, 3 images per note, 200 px width) so limits can be tested with tiny files, and stores uploads in `uploads/test`. Mail is disabled; tests spy on `transporter.sendMail` from [`src/shared/mail.ts`](../src/shared/mail.ts) to check what would be sent.
- **Clean state per test:** before each test all users, notes, images, sessions, portfolio sections, media and contact messages are deleted and the test uploads folder is emptied ([`src/test/setup.ts`](../src/test/setup.ts)). Tests therefore do not depend on each other.
- **No parallel files:** test files run one after another because they share the database.

The environment variables for tests are set in [`vitest.config.ts`](../vitest.config.ts); your `.env` is not used.

## Writing a test

[`src/test/helpers.ts`](../src/test/helpers.ts) provides the app and signed-in clients:

```ts
import { describe, expect, it } from 'vitest';
import { signedUpAgent } from '../../test/helpers.js';

describe('notes', () => {
  it('creates a note', async () => {
    const agent = await signedUpAgent('ada@example.com');

    const res = await agent.post('/api/v1/notes').send({ title: 'First' }).expect(201);

    expect(res.body.note.title).toBe('First');
  });
});
```

`signedUpAgent()` signs up a new user and returns a supertest agent that keeps the session cookie. Create two agents to test that one user cannot reach another user's data.

`adminAgent()` creates the admin from `config/test.json`, as the server does at startup, and returns an agent signed in as that admin.

`pngImage(width, height)` creates a test image, `uploadedMediaId(admin)` uploads one to `/media` and returns its id for an image reference.

Test files live next to the code they test and end in `.test.ts`.

## What is covered

- **Auth:** sign-up, optional name, duplicate email, invalid input, sign-in with right and wrong credentials, sign-out, missing session, foreign origin.
- **Notes:** CRUD, sanitizing, validation, isolation between two users (notes and images), image processing and file cleanup, the all-or-nothing upload, upload limits.
- **Admin:** creating the first admin, access for admins only, listing users, granting and removing admin rights, the block on changing the own account, deleting a user with sessions, notes and files, revoking sessions.
- **Portfolio:** sections are null until created, writes for admins only, create once (409), partial `PATCH` with `null` clearing optional fields, arrays replaced in order, validation (both languages, http(s) URLs, unknown images), resolved images and `?lang=`, the seed (fills only missing sections, idempotent).
- **Media:** admin-only upload and list, WebP processing and the public cached file, invalid and too large files, the 409 for images still in use.
- **Contact:** storing and forwarding by mail, a failed mail still answers 204, validation (also no line breaks in the name), the admin-only inbox, order, read flag, delete.
- **Docs:** the API reference is served, every existing route is documented and every documented route exists, and real responses match the documented shapes.

The docs tests mean that adding an endpoint without documenting it fails the suite. When you add a feature, add its router to the list in [`src/features/docs/docs.test.ts`](../src/features/docs/docs.test.ts).
