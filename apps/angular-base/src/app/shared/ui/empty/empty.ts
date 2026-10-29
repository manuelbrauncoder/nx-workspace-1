import { Component, input } from '@angular/core';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { UiIcon } from '../icon/icon';
import { UiIconName } from '../icon/ui-icons';

/**
 * Empty state for a list or page without entries. The projected content is the place for the
 * action that gets the user out of the empty state.
 *
 * @example
 * <app-ui-empty
 *   icon="notebookPen"
 *   heading="Noch keine Notizen"
 *   description="Lege deine erste Notiz an, um loszulegen."
 * >
 *   <a appUiButton routerLink="new">Neue Notiz</a>
 * </app-ui-empty>
 */
@Component({
  selector: 'app-ui-empty',
  imports: [HlmEmptyImports, UiIcon],
  styleUrl: './empty.scss',
  templateUrl: './empty.html',
})
export class UiEmpty {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<UiIconName>();
  /** Level of the heading in the page outline. */
  readonly headingLevel = input<1 | 2 | 3 | 4 | 5 | 6>(2);
}
