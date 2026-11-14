import { Component, ViewEncapsulation } from '@angular/core';

/**
 * A plain list in a bordered panel, one row per entry with a line between the rows. For work
 * pages that list many things (guests, members, accounts) where cards would be too loud. The
 * rows are `li[appUiListItem]`; what goes into a row is up to the page.
 *
 * @example
 * <ul appUiList>
 *   @for (guest of guests; track guest.id) {
 *     <li appUiListItem>{{ guest.name }}</li>
 *   }
 * </ul>
 */
@Component({
  selector: 'ul[appUiList], ol[appUiList]',
  templateUrl: './list.html',
  styleUrl: './list.scss',
  // The rows are projected, so the styles have to reach them. The class names are the scope.
  encapsulation: ViewEncapsulation.None,
  // `role`: Safari drops the list role of a list without bullets.
  host: { class: 'ui-list', role: 'list' },
})
export class UiList {}

/** One row of an `appUiList`. */
@Component({
  selector: 'li[appUiListItem]',
  templateUrl: './list.html',
  host: { class: 'ui-list__item' },
})
export class UiListItem {}

export const UiListImports = [UiList, UiListItem] as const;
