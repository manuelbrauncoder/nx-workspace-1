import { booleanAttribute, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';

/** Moves an entry of a list, e.g. a project, up or down, or removes it. */
@Component({
  selector: 'app-list-item-actions',
  imports: [TranslatePipe, UiButton, UiIcon],
  styleUrl: './list-item-actions.scss',
  templateUrl: './list-item-actions.html',
})
export class ListItemActions {
  /** Names the entry for screen readers, e.g. "Projekt 2". */
  readonly name = input.required<string>();
  readonly first = input(false, { transform: booleanAttribute });
  readonly last = input(false, { transform: booleanAttribute });

  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly remove = output<void>();
}
