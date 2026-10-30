import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { guestGuard, signUpGuard } from './application/auth.guards';
import { signInI18n } from './presentation/sign-in/sign-in.i18n';
import { signUpI18n } from './presentation/sign-up/sign-up.i18n';

// `AuthStore` and `AuthUseCase` are provided app-wide, so there are no providers here.
export const authRoutes: Routes = [
  {
    path: '',
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
        path: 'sign-up',
        title: 'signUp.title',
        canActivate: [guestGuard, signUpGuard, loadI18nScope(signUpI18n)],
        loadComponent: () => import('./presentation/sign-up/sign-up').then((m) => m.SignUp),
      },
    ],
  },
];
