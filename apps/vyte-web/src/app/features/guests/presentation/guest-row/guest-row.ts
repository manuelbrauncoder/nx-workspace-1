import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { Guest } from '../../domain/guest';

/**
 * One guest as a row of the list: name, answer as a dot and its word, how many they may bring,
 * their message and the note of the hosts. Copying the personal link sits on the row, everything
 * else in a menu.
 */
@Component({
  selector: 'app-guest-row',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiIcon, UiMenuImports],
  styleUrl: './guest-row.scss',
  templateUrl: './guest-row.html',
  host: {
    '[attr.data-guest]': 'guest().id',
  },
})
export class GuestRow {
  readonly guest = input.required<Guest>();
  /** Zone of the event, in which the time of the answer is shown. */
  readonly timeZone = input.required<string>();
  /** A past event cannot be changed, the row then only shows. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** The device can share a link (Web Share API). */
  readonly canShare = input(false, { transform: booleanAttribute });

  readonly copyLink = output<void>();
  readonly shareLink = output<void>();
  readonly edit = output<void>();
  readonly answer = output<void>();
  readonly renewLink = output<void>();
  readonly renewPhotoLink = output<void>();
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

  private readonly _allowanceKey = computed(() => {
    const max = this.guest().maxCompanions;
    return max === 0
      ? 'guestList.card.allowanceNone'
      : max === 1
        ? 'guestList.card.allowanceOne'
        : 'guestList.card.allowance';
  });

  /** Whether the second line has anything to tell. */
  private readonly _hasDetails = computed(() => {
    const guest = this.guest();
    return (
      guest.answeredBy === 'host' ||
      guest.companionsReduced ||
      guest.respondedAt !== null ||
      !!guest.message ||
      !!guest.note
    );
  });
}
