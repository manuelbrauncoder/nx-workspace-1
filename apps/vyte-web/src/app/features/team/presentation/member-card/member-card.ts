import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { Member } from '../../domain/team';

/**
 * One member of the team: name, email, role and since when. The owner manages an editor through
 * the menu: hand the event over or remove them.
 */
@Component({
  selector: 'app-member-card',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiCardImports, UiIcon, UiMenuImports, UiText],
  styleUrl: './member-card.scss',
  templateUrl: './member-card.html',
})
export class MemberCard {
  readonly member = input.required<Member>();
  /** The signed-in user. */
  readonly isMe = input(false, { transform: booleanAttribute });
  /** Shows the menu: the signed-in owner looks at an editor of an upcoming event. */
  readonly manageable = input(false, { transform: booleanAttribute });

  readonly handOver = output<void>();
  readonly remove = output<void>();

  /** Without a name the email stands in, it then appears only once. */
  private readonly _displayName = computed(() => this.member().name ?? this.member().email);
  private readonly _isOwner = computed(() => this.member().role === 'owner');
  private readonly _timeZone = APP_TIME_ZONE;
}
