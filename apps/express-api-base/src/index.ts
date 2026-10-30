import { startServer } from '@server/core/server';
import { createApp } from './app.js';
import { seedAdmin } from './features/admin/admin.seed.js';

await seedAdmin();

startServer(createApp());
