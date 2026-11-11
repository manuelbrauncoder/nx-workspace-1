import * as helpers from '@server/auth/testing/helpers';
import { createApp } from '../app.js';
import { apiPrefix } from '../shared/api.js';

export const app = createApp();

export const signedUpAgent = (email: string) => helpers.signedUpAgent(app, email, apiPrefix);
export const adminAgent = () => helpers.adminAgent(app, apiPrefix);
