import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { AdminStore } from './application/admin.store';
import { AdminUseCase } from './domain/admin.usecase';
import { userListI18n } from './presentation/user-list/user-list.i18n';

// `adminGuard` sits on the parent route in `app.routes.ts`.
export const adminRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [AdminUseCase, AdminStore],
    // Admin pages do not belong into a search result. Applies to every child.
    data: routeSeo({ index: false }),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        title: 'userList.title',
        canActivate: [loadI18nScope(userListI18n)],
        loadComponent: () => import('./presentation/user-list/user-list').then((m) => m.UserList),
      },
    ],
  },
];
