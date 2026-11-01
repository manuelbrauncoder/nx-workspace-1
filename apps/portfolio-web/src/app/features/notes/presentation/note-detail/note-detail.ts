import { Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { toMetaDescription } from '@core/seo/meta-description';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiButton } from '@shared/ui/button/button';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { NotesStore } from '../../application/notes.store';
import { NoteDeleteButton } from '../note-delete-button/note-delete-button';

/** Read-only view of a single note on `/notes/:id`. */
@Component({
  selector: 'app-note-detail',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiAttachmentImports,
    UiButton,
    UiRichText,
    UiText,
    NoteDeleteButton,
  ],
  styleUrl: './note-detail.scss',
  templateUrl: './note-detail.html',
})
export class NoteDetail {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(NotesStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  constructor() {
    effect(() => this._store.select(this.id()));
    injectPageSeo(() => {
      const note = this._store.selected();
      return note && { title: note.title, description: toMetaDescription(note.description) };
    });
  }

  private async _remove(): Promise<void> {
    if (await this._store.remove(this.id())) {
      this._toast.success(this._i18n.translate('notes.deleted'));
      await this._router.navigate(['/notes']);
    }
  }
}
