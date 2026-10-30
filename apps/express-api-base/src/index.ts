import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/index.js';
import { seedAdmin } from './features/admin/admin.seed.js';
import { logger } from './shared/logger.js';

await seedAdmin();

const server = createApp().listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
