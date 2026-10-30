import * as helpers from '@server/auth/testing/helpers';
import { createApp } from '../app.js';

export const app = createApp();

export const signedUpAgent = (email: string) => helpers.signedUpAgent(app, email);
export const adminAgent = () => helpers.adminAgent(app);
