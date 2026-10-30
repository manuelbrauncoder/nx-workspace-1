import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../db/migrate';

/** Creates the test database if it is missing and brings it up to date. */
export default async function setup(project: TestProject) {
  const databaseUrl = project.config.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is not set for tests');

  const url = new URL(databaseUrl);
  const database = url.pathname.slice(1);
  url.pathname = '/postgres';

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (existing.rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  } finally {
    await client.end();
  }

  await runMigrations(databaseUrl);
}
