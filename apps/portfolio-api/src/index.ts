import { seedAdmin } from '@server/auth/admin.seed';
import { startServer } from '@server/core/server';
import { createApp } from './app.js';

await seedAdmin();

startServer(createApp());
