import { resetAuthTables } from '@server/auth/testing/helpers';
import { db, pool } from '@server/core/db/db';
import { sql } from 'drizzle-orm';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach } from 'vitest';
import { config } from '../config/index.js';

// Every test starts with an empty database and an empty uploads directory.
beforeEach(async () => {
  await resetAuthTables();
  await db.execute(sql`TRUNCATE portfolio_sections, media, contact_messages, legal_pages CASCADE`);
  await mkdir(config.uploads.dir, { recursive: true });
  for (const file of await readdir(config.uploads.dir)) {
    await rm(path.join(config.uploads.dir, file));
  }
});

afterAll(async () => {
  await pool.end();
  await rm(config.uploads.dir, { recursive: true, force: true });
});
