import { DestroyRef, effect, inject } from '@angular/core';
import { PageSeo, SeoService } from './seo.service';

/**
 * Sets title and description of a page from its loaded data. Until the data is there, and after
 * the page was left, the settings of the route apply. Call it in the constructor of the page.
 *
 * @example
 * injectPageSeo(() => {
 *   const note = this._store.selected();
 *   return note && { title: note.title, description: toMetaDescription(note.content) };
 * });
 */
export function injectPageSeo(page: () => PageSeo | undefined): void {
  const seo = inject(SeoService);
  effect(() => seo.setPage(page()));
  inject(DestroyRef).onDestroy(() => seo.setPage(undefined));
}
