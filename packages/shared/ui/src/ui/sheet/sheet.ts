import { booleanAttribute, Component, input, model, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { UiButton } from '../button/button';
import { UiIcon } from '../icon/icon';

export type UiSheetSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * Panel that slides in from an edge of the screen and covers the page as a modal dialog, e.g.
 * for a mobile navigation or a filter. `open` is two-way bound, the projected content is the
 * body. Escape, a click outside and the close button set `open` back to `false`.
 *
 * @example
 * <button (click)="_filterOpen.set(true)" appUiButton variant="outline" type="button">
 *   Filter
 * </button>
 *
 * <app-ui-sheet [(open)]="_filterOpen" heading="Filter" side="right">
 *   <app-form-select [formField]="filterForm.status" label="Status" />
 * </app-ui-sheet>
 *
 * @example
 * <!-- Own content in place of the visible heading, which still names the dialog -->
 * <app-ui-sheet [(open)]="_menuOpen" heading="Navigation" hideHeading>
 *   <img appUiSheetHeader ngSrc="/logo.svg" width="32" height="32" alt="" />
 * </app-ui-sheet>
 */
@Component({
  selector: 'app-ui-sheet',
  imports: [HlmSheetImports, TranslatePipe, UiButton, UiIcon],
  styleUrl: './sheet.scss',
  templateUrl: './sheet.html',
})
export class UiSheet {
  readonly open = model(false);
  /** Shown at the top of the panel and used as the accessible name of the dialog. */
  readonly heading = input.required<string>();
  /**
   * Hides the heading visually, it stays the accessible name of the dialog. For a panel that
   * shows its own content in the header via `appUiSheetHeader`.
   */
  readonly hideHeading = input(false, { transform: booleanAttribute });
  /** Edge of the screen the panel slides in from. */
  readonly side = input<UiSheetSide>('right');
  /** Lets a panel on the left or right cover the whole width on small screens. */
  readonly fullWidth = input(false, { transform: booleanAttribute });
  /**
   * Emits once the panel is gone and the page scrolls again. While it is open the page is
   * locked, so a jump to a section of the page has to wait for this.
   */
  readonly closed = output<void>();
}
