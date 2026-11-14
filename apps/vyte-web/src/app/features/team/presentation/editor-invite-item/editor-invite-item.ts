import { booleanAttribute, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { EditorInvite } from '../../domain/team';

/**
 * An open editor invite as a row of the list: when it was made, until when it works, the address, and buttons to
 * copy, share or revoke it. An invite has no name, the time it was made tells them apart.
 */
@Component({
  selector: 'app-editor-invite-item',
  imports: [TranslatePipe, UiButton, UiIcon, UiText],
  styleUrl: './editor-invite-item.scss',
  templateUrl: './editor-invite-item.html',
  host: {
    '[attr.data-invite]': 'invite().id',
  },
})
export class EditorInviteItem {
  readonly invite = input.required<EditorInvite>();
  /** The address that opens the invite. */
  readonly url = input.required<string>();
  /** The device can share a link (Web Share API). */
  readonly canShare = input(false, { transform: booleanAttribute });

  readonly copyLink = output<void>();
  readonly shareLink = output<void>();
  readonly revoke = output<void>();

  private readonly _i18n = inject(I18nService);

  private readonly _created = computed(() =>
    formatLocalDate(this.invite().createdAt, this._i18n.locale(), 'dateTime', APP_TIME_ZONE),
  );
  private readonly _expires = computed(() =>
    formatLocalDate(this.invite().expiresAt, this._i18n.locale(), 'dateTime', APP_TIME_ZONE),
  );
}
