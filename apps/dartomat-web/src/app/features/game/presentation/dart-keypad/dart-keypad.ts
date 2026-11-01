import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiToggleGroup } from '@shared/ui/toggle-group/toggle-group';
import { DartThrow, Multiplier } from '../../domain/game';

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

/**
 * Entering a dart: first the ring (single by default), then the segment. The ring goes back to
 * single after every dart. 50 is the double bull, a miss is always a single.
 */
@Component({
  selector: 'app-dart-keypad',
  imports: [TranslatePipe, UiButton, UiToggleGroup],
  styleUrl: './dart-keypad.scss',
  templateUrl: './dart-keypad.html',
})
export class DartKeypad {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly dartThrown = output<DartThrow>();

  private readonly _i18n = inject(I18nService);

  private readonly _numbers = NUMBERS;
  private readonly _multiplier = signal<Multiplier | null>(1);
  /** Computed, so the labels follow the language. */
  private readonly _multipliers = computed(() => [
    { value: 1 as const, label: this._i18n.translate('gamePage.keypad.single') },
    { value: 2 as const, label: this._i18n.translate('gamePage.keypad.double') },
    { value: 3 as const, label: this._i18n.translate('gamePage.keypad.triple') },
  ]);

  /** `value` is the segment, 50 stands for the double bull and 0 for a miss. */
  private _throw(value: number): void {
    const chosen = this._multiplier() ?? 1;
    let dart: DartThrow;
    if (value === 50) {
      dart = { multiplier: 2, value: 25 };
    } else if (value === 25) {
      dart = { multiplier: chosen === 3 ? 1 : chosen, value };
    } else if (value === 0) {
      dart = { multiplier: 1, value };
    } else {
      dart = { multiplier: chosen, value };
    }
    this.dartThrown.emit(dart);
    this._multiplier.set(1);
  }
}
