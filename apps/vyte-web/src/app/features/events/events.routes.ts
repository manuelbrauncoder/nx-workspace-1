import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { EventsStore } from './application/events.store';
import { EventsUseCase } from './domain/events.usecase';
import { eventDetailI18n } from './presentation/event-detail/event-detail.i18n';
import { eventEditorI18n } from './presentation/event-editor/event-editor.i18n';
import { eventsListI18n } from './presentation/events-list/events-list.i18n';

export const eventsRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [EventsUseCase, EventsStore],
    // Events are private, so none of these pages belongs into a search result.
    data: routeSeo({ index: false }),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'eventsList.title',
        canActivate: [loadI18nScope(eventsListI18n)],
        loadComponent: () =>
          import('./presentation/events-list/events-list').then((m) => m.EventsList),
      },
      {
        path: 'new',
        title: 'eventEditor.titleNew',
        canActivate: [loadI18nScope(eventEditorI18n)],
        loadComponent: () =>
          import('./presentation/event-editor/event-editor').then((m) => m.EventEditor),
      },
      {
        path: ':id',
        title: 'eventDetail.title',
        // The title of the loaded event replaces this one, see `EventDetail`.
        canActivate: [loadI18nScope(eventDetailI18n)],
        loadComponent: () =>
          import('./presentation/event-detail/event-detail').then((m) => m.EventDetail),
      },
      {
        path: ':id/edit',
        title: 'eventEditor.titleEdit',
        canActivate: [loadI18nScope(eventEditorI18n)],
        loadComponent: () =>
          import('./presentation/event-editor/event-editor').then((m) => m.EventEditor),
      },
    ],
  },
];
