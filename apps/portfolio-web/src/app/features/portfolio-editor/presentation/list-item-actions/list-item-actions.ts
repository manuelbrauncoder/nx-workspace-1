import {
  afterNextRender,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
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

  private readonly _injector = inject(Injector);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Moving re-inserts the entry, which drops the focus, and at the first or last place the button
   * turns disabled. So the focus goes back to the same button, or to the other one at the edge.
   */
  private _move(direction: 'up' | 'down'): void {
    (direction === 'up' ? this.moveUp : this.moveDown).emit();
    afterNextRender(
      () => {
        const [up, down] = this._host.nativeElement.querySelectorAll('button');
        const [clicked, other] = direction === 'up' ? [up, down] : [down, up];
        (clicked?.disabled ? other : clicked)?.focus();
      },
      { injector: this._injector },
    );
  }
}
