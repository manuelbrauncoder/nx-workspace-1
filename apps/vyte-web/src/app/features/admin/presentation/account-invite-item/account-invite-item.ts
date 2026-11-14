import { Component, input, output } from '@angular/core';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { AccountInvite } from '../../domain/admin';

/** An open account link as a row of the list: for whom, until when, the address, and buttons to copy or revoke it. */
@Component({
  selector: 'app-account-invite-item',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiIcon, UiText],
  styleUrl: './account-invite-item.scss',
  templateUrl: './account-invite-item.html',
})
export class AccountInviteItem {
  readonly invite = input.required<AccountInvite>();
  /** The address that opens the link. */
  readonly url = input.required<string>();

  readonly copyLink = output<void>();
  readonly revoke = output<void>();

  private readonly _timeZone = APP_TIME_ZONE;
}
