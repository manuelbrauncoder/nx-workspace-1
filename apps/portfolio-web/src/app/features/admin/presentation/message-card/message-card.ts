import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { ReceivedMessage } from '../../domain/admin';

/**
 * One message of the contact form: sender, time and text, with the actions to reply, to mark it
 * as read or unread and to delete it. The text is shown as typed, never as HTML.
 */
@Component({
  selector: 'app-message-card',
  imports: [LocalDatePipe, TranslatePipe, UiButton, UiCardImports, UiIcon],
  styleUrl: './message-card.scss',
  templateUrl: './message-card.html',
  host: { '[class.message-card--unread]': '!message().read' },
})
export class MessageCard {
  readonly message = input.required<ReceivedMessage>();

  readonly toggleRead = output<void>();
  /** The visitor clicked "reply", which opens the mail program. */
  readonly reply = output<void>();
  readonly remove = output<void>();

  private readonly _i18n = inject(I18nService);

  private readonly _replyHref = computed(() => {
    const subject = this._i18n.translate('messageList.replySubject');
    return `mailto:${this.message().email}?subject=${encodeURIComponent(subject)}`;
  });
}
