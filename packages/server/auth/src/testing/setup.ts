import { pool } from '@server/core/db/db';
import { afterAll, beforeEach } from 'vitest';
import { resetAuthTables } from './helpers';

// Every test starts with an empty database.
beforeEach(resetAuthTables);

afterAll(async () => {
  await pool.end();
});
