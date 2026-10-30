import { Component, computed, DOCUMENT, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { isInternalRichTextHref, RichTextProfile } from '@contracts/rich-text';
import { restrictRichText } from './restrict-rich-text';

/**
 * Shows stored rich text, as written with `app-form-rich-text`. The HTML is untrusted: it is
 * reduced to the allowed formats and sanitized before it is rendered, so this is the only place
 * that may bind stored HTML. A link to a path of this site goes through the router.
 *
 * @example
 * <app-ui-rich-text [html]="note.content" />
 * <app-ui-rich-text [html]="imprintHtml" profile="page" />
 */
@Component({
  selector: 'app-ui-rich-text',
  host: { '(click)': '_followInternalLink($event)' },
  styleUrl: './rich-text.scss',
  templateUrl: './rich-text.html',
})
export class UiRichText {
  readonly html = input.required<string>();
  /** `page` for a page of this site: allows links within the site and to a phone number. */
  readonly profile = input<RichTextProfile>('text');

  private readonly _document = inject(DOCUMENT);
  private readonly _router = inject(Router);

  private readonly _safeHtml = computed(() =>
    restrictRichText(this.html(), this._document, this.profile()),
  );

  /** A plain click on `/privacy` navigates in the app; with a modifier key the browser decides. */
  private _followInternalLink(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    const href = link?.getAttribute('href');
    if (href && isInternalRichTextHref(href)) {
      event.preventDefault();
      void this._router.navigateByUrl(href);
    }
  }
}
