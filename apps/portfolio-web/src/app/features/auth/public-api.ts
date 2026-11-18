// The one file of this feature that the app shell and other features may import, see
// `eslint.config.js`. Everything else of the feature stays private.
export { adminGuard, authGuard, guestGuard } from './application/auth.guards';
export { AuthStore } from './application/auth.store';
export { sessionExpiredInterceptor } from './application/session-expired.interceptor';
export type { Me, MeRole } from './domain/me';
export { injectAccountActions, type AccountActions } from './presentation/account-actions';
export { AccountMenu } from './presentation/account-menu/account-menu';
export { provideAuth } from './provide-auth';
