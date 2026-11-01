import { startServer } from '@server/core/server';
import { createApp } from './app.js';

startServer(createApp());
