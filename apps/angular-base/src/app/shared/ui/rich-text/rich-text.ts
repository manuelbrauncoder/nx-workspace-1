import { Component, computed, DOCUMENT, inject, input } from '@angular/core';
import { restrictRichText } from './restrict-rich-text';

/**
 * Shows stored rich text, as written with `app-form-rich-text`. The HTML is untrusted: it is
 * reduced to the allowed formats and sanitized before it is rendered, so this is the only place
 * that may bind stored HTML.
 *
 * @example
 * <app-ui-rich-text [html]="note.content" />
 */
@Component({
  selector: 'app-ui-rich-text',
  styleUrl: './rich-text.scss',
  templateUrl: './rich-text.html',
})
export class UiRichText {
  readonly html = input.required<string>();

  private readonly _document = inject(DOCUMENT);

  private readonly _safeHtml = computed(() => restrictRichText(this.html(), this._document));
}
