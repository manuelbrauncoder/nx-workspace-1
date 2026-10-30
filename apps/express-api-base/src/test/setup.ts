import { sql } from 'drizzle-orm';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeEach } from 'vitest';
import { config } from '../config/index.js';
import { db, pool } from '../db/index.js';

// Every test starts with an empty database and an empty uploads directory.
beforeEach(async () => {
  await db.execute(sql`TRUNCATE users, session CASCADE`);
  await mkdir(config.uploads.dir, { recursive: true });
  for (const file of await readdir(config.uploads.dir)) {
    await rm(path.join(config.uploads.dir, file));
  }
});

afterAll(async () => {
  await pool.end();
  await rm(config.uploads.dir, { recursive: true, force: true });
});
