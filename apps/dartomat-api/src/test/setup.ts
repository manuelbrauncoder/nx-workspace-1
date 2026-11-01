import { db, pool } from '@server/core/db/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

// Every test starts with an empty database.
beforeEach(async () => {
  await db.execute(sql`TRUNCATE games CASCADE`);
});

afterAll(async () => {
  await pool.end();
});
