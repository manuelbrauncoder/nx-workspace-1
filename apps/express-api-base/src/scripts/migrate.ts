import { runMigrations } from '../db/migrate.js';

// Reads only DATABASE_URL so it can run in a container without the JSON config file.
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

await runMigrations(databaseUrl);
console.log('Migrations applied');
