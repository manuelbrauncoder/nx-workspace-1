import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiText } from '@shared/ui/text/text';
import { Guest } from '../../domain/guest';

/**
 * One guest of the list: name, how many they may bring, their answer and message, the note of
 * the hosts. Copying and sharing the personal link sit on the card, everything else in a menu.
 */
@Component({
  selector: 'app-guest-card',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiCardImports, UiIcon, UiMenuImports, UiText],
  styleUrl: './guest-card.scss',
  templateUrl: './guest-card.html',
  host: {
    '[attr.data-guest]': 'guest().id',
  },
})
export class GuestCard {
  readonly guest = input.required<Guest>();
  /** Zone of the event, in which the time of the answer is shown. */
  readonly timeZone = input.required<string>();
  /** A past event cannot be changed, the card then only shows. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** The device can share a link (Web Share API). */
  readonly canShare = input(false, { transform: booleanAttribute });

  readonly copyLink = output<void>();
  readonly shareLink = output<void>();
  readonly edit = output<void>();
  readonly answer = output<void>();
  readonly renewLink = output<void>();
  readonly remove = output<void>();

  private readonly _answerKey = computed(() => {
    const guest = this.guest();
    if (guest.response === 'accepted') {
      return guest.companions === 0
        ? 'guestList.card.accepted'
        : guest.companions === 1
          ? 'guestList.card.acceptedWithOne'
          : 'guestList.card.acceptedWith';
    }
    return guest.response === 'declined' ? 'guestList.card.declined' : 'guestList.card.pending';
  });

  private readonly _allowanceKey = computed(() =>
    this.guest().maxCompanions === 1 ? 'guestList.card.allowanceOne' : 'guestList.card.allowance',
  );
}
