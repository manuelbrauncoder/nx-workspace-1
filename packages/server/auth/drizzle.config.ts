import { defineConfig } from 'drizzle-kit';

// Migrations of the auth tables alone, used by the tests of this lib. Every API app generates
// its own migrations, which include these tables.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/*.table.ts',
  out: './drizzle',
});
