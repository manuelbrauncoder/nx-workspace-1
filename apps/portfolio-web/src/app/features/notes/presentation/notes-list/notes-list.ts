import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { NotesStore } from '../../application/notes.store';
import { NoteCard } from '../note-card/note-card';

@Component({
  selector: 'app-notes-list',
  imports: [
    RouterLink,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiButton,
    UiEmpty,
    UiIcon,
    UiText,
    NoteCard,
  ],
  styleUrl: './notes-list.scss',
  templateUrl: './notes-list.html',
})
export class NotesList {
  private readonly _store = inject(NotesStore);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private async _remove(id: string): Promise<void> {
    if (await this._store.remove(id)) {
      this._toast.success(this._i18n.translate('notes.deleted'));
    }
  }
}
