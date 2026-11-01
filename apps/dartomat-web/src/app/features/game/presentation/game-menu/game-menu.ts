import { Component, input, model, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormSwitch } from '@shared/form-controls/form-switch/form-switch';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiSheet } from '@shared/ui/sheet/sheet';

/** The options of a running game in a sheet from the bottom. The page carries out the actions. */
@Component({
  selector: 'app-game-menu',
  imports: [TranslatePipe, FormSwitch, UiButton, UiIcon, UiSheet],
  styleUrl: './game-menu.scss',
  templateUrl: './game-menu.html',
})
export class GameMenu {
  readonly open = model(false);
  readonly doubleOut = input.required<boolean>();
  readonly disabled = input(false);

  readonly doubleOutChange = output<boolean>();
  readonly copyLink = output<void>();
  readonly restart = output<void>();
  readonly quit = output<void>();
}
