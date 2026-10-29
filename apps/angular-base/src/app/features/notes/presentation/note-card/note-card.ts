import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { Note } from '../../domain/note';
import { NoteDeleteButton } from '../note-delete-button/note-delete-button';

@Component({
  selector: 'app-note-card',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    UiButton,
    UiCardImports,
    UiRichText,
    NoteDeleteButton,
  ],
  styleUrl: './note-card.scss',
  templateUrl: './note-card.html',
})
export class NoteCard {
  readonly note = input.required<Note>();

  /** Emits after the user confirmed the deletion. */
  readonly remove = output<void>();
}
