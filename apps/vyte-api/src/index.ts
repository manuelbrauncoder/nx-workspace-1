import { seedAdmin } from '@server/auth/admin.seed';
import { startServer } from '@server/core/server';
import { createApp } from './app.js';
import { seedLegalOnStart } from './features/legal/legal.seed.js';

await seedAdmin();
// Creates the legal pages that do not exist yet from seed/legal/, edited later by the admin.
await seedLegalOnStart('seed');

startServer(createApp());
