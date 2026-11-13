import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { UiIcon } from '../icon/icon';

/** A page number, or a gap for the pages left out between them. */
export type UiPaginationItem = number | 'gap';

/**
 * The page numbers to show: always the first and the last, the current one with its neighbours,
 * gaps in between. At most seven entries, so the bar fits a phone.
 */
export function paginationItems(page: number, pageCount: number): UiPaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [
    1,
    ...(start > 2 ? (['gap'] as const) : []),
    ...middle,
    ...(end < pageCount - 1 ? (['gap'] as const) : []),
    pageCount,
  ];
}

/**
 * Pages of a long list as links: the page lives in a query parameter of the current route, so
 * the back button and a shared address keep it. The page reads it through component input
 * binding and slices its list. Hidden while there is only one page.
 *
 * @example
 * <app-ui-pagination
 *   [page]="_page()"
 *   [pageCount]="_pageCount()"
 *   fragment="guest-list-guests"
 *   label="Seiten der Gästeliste"
 * />
 */
@Component({
  selector: 'app-ui-pagination',
  imports: [HlmPaginationImports, TranslatePipe, UiIcon],
  styleUrl: './pagination.scss',
  templateUrl: './pagination.html',
})
export class UiPagination {
  /** The current page, starting at 1. */
  readonly page = input.required<number>();
  readonly pageCount = input.required<number>();
  /** Name of the navigation, e.g. what is paged. */
  readonly label = input.required<string>();
  /** The query parameter that holds the page. */
  readonly queryParam = input('page');
  /**
   * Id of an element to jump to on a new page, e.g. the heading of the list with
   * `tabindex="-1"`. The app shell then focuses it, so the keyboard starts at the list again.
   */
  readonly fragment = input<string>();

  private readonly _items = computed(() => paginationItems(this.page(), this.pageCount()));

  /** Page 1 is the default, its address carries no parameter. */
  private _params(page: number): Record<string, number | null> {
    return { [this.queryParam()]: page === 1 ? null : page };
  }
}
