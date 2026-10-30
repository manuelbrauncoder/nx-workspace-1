import { pool } from '@server/core/db/db';
import { HttpError } from '@server/core/errors';
import { seedLegal } from '../features/legal/legal.seed.js';
import { seedPortfolio } from '../features/portfolio/portfolio.seed.js';

// Fills the portfolio sections and legal pages that do not exist yet. Run from the project root (or /app in
// the container), optionally with another seed directory as the first argument.
const dir = process.argv[2] ?? 'seed';

try {
  const created = [...(await seedPortfolio(dir)), ...(await seedLegal(dir))];
  console.log(
    created.length > 0 ? `Created: ${created.join(', ')}` : 'Nothing to seed, everything exists',
  );
} catch (error) {
  console.error('Seeding failed:', error instanceof HttpError ? error.message : error);
  if (error instanceof HttpError && error.details) console.error(error.details);
  process.exitCode = 1;
} finally {
  await pool.end();
}
