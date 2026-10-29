import { Routes } from '@angular/router';
import { loadI18nScope } from '@core/i18n/i18n-scope';
import { routeSeo } from '@core/seo/route-seo';
import { NotesStore } from './application/notes.store';
import { NotesUseCase } from './domain/notes.usecase';
import { noteDetailI18n } from './presentation/note-detail/note-detail.i18n';
import { noteEditorI18n } from './presentation/note-editor/note-editor.i18n';
import { notesListI18n } from './presentation/notes-list/notes-list.i18n';

export const notesRoutes: Routes = [
  {
    path: '',
    // Both live as long as the feature. The use case is its only way to the API layer.
    providers: [NotesUseCase, NotesStore],
    children: [
      {
        path: '',
        pathMatch: 'full',
        // A route title is a translation key, the scope of the page is loaded before it renders.
        title: 'notesList.title',
        // Notes are private, so none of these pages belongs into a search result.
        data: routeSeo({ index: false }),
        canActivate: [loadI18nScope(notesListI18n)],
        loadComponent: () =>
          import('./presentation/notes-list/notes-list').then((m) => m.NotesList),
      },
      {
        path: 'new',
        title: 'noteEditor.titleNew',
        data: routeSeo({ index: false }),
        canActivate: [loadI18nScope(noteEditorI18n)],
        loadComponent: () =>
          import('./presentation/note-editor/note-editor').then((m) => m.NoteEditor),
      },
      {
        path: ':id',
        title: 'noteDetail.title',
        // The title of the loaded note replaces this one, see `NoteDetail`.
        data: routeSeo({ index: false }),
        canActivate: [loadI18nScope(noteDetailI18n)],
        loadComponent: () =>
          import('./presentation/note-detail/note-detail').then((m) => m.NoteDetail),
      },
      {
        path: ':id/edit',
        title: 'noteEditor.titleEdit',
        data: routeSeo({ index: false }),
        canActivate: [loadI18nScope(noteEditorI18n)],
        loadComponent: () =>
          import('./presentation/note-editor/note-editor').then((m) => m.NoteEditor),
      },
    ],
  },
];
