import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { User } from '../../domain/admin';

/**
 * One account in the list: name, email, role and since when it exists. The actions sit in a
 * menu. The own account has none, the backend refuses to change or delete it.
 */
@Component({
  selector: 'app-user-card',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiCardImports, UiIcon, UiMenuImports, UiText],
  styleUrl: './user-card.scss',
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly user = input.required<User>();
  /** The signed-in admin, who cannot change their own account here. */
  readonly isMe = input(false, { transform: booleanAttribute });

  readonly toggleRole = output<void>();
  readonly revokeSessions = output<void>();
  readonly remove = output<void>();

  /** Without a name the email stands in, it then appears only once. */
  private readonly _displayName = computed(() => this.user().name ?? this.user().email);
  private readonly _isAdmin = computed(() => this.user().role === 'admin');
  private readonly _timeZone = APP_TIME_ZONE;
}
