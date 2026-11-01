import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { shellLayout } from '@core/layout/shell-layout';
import { routeSeo } from '@core/seo/route-seo';
import { ContactStore } from './application/contact.store';
import { loadPortfolio } from './application/load-portfolio.guard';
import { PortfolioStore } from './application/portfolio.store';
import { ContactUseCase } from './domain/contact.usecase';
import { PortfolioUseCase } from './domain/portfolio.usecase';
import { portfolioHomeI18n } from './presentation/portfolio-home/portfolio-home.i18n';

export const portfolioRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // They live as long as the feature. The use cases are its only way to the API layer.
    providers: [PortfolioUseCase, PortfolioStore, ContactUseCase, ContactStore],
    title: 'portfolioHome.title',
    // The sections run across the full width, each brings its own container. Title and
    // description of the route apply until the content with its own SEO texts is loaded.
    data: {
      ...routeSeo({ description: 'portfolioHome.description' }),
      ...shellLayout('full-bleed'),
    },
    canActivate: [loadI18nScope(portfolioHomeI18n), loadPortfolio],
    loadComponent: () =>
      import('./presentation/portfolio-home/portfolio-home').then((m) => m.PortfolioHome),
  },
];
