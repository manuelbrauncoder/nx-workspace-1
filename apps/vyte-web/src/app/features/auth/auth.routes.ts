import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { guestGuard } from './application/auth.guards';
import { WelcomeStore } from './application/welcome.store';
import { signInI18n } from './presentation/sign-in/sign-in.i18n';
import { welcomeI18n } from './presentation/welcome/welcome.i18n';

// `AuthStore` and `AuthUseCase` are provided app-wide, so there are no providers here.
export const authRoutes: Routes = [
  {
    path: '',
    // There is no sign-up page: accounts come from an account link (`/welcome/:token`) or an
    // editor invite.
    // Forms are of no use in a search result. Applies to every child.
    data: routeSeo({ index: false }),
    children: [
      {
        path: 'sign-in',
        title: 'signIn.title',
        canActivate: [guestGuard, loadI18nScope(signInI18n)],
        loadComponent: () => import('./presentation/sign-in/sign-in').then((m) => m.SignIn),
      },
      {
        // The account link an admin created. A signed-in user does not need it.
        path: 'welcome/:token',
        title: 'welcome.title',
        providers: [WelcomeStore],
        canActivate: [guestGuard, loadI18nScope(welcomeI18n)],
        loadComponent: () => import('./presentation/welcome/welcome').then((m) => m.Welcome),
      },
    ],
  },
];
