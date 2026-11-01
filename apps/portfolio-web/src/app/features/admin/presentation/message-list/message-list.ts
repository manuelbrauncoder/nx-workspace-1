import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AdminStore } from '../../application/admin.store';
import { ReceivedMessage } from '../../domain/admin';
import { MessageCard } from '../message-card/message-card';

/** The messages of the contact form on `/admin/messages`, newest first. */
@Component({
  selector: 'app-message-list',
  imports: [TranslatePipe, AsyncContent, FailureAlert, UiBreadcrumb, UiEmpty, UiText, MessageCard],
  styleUrl: './message-list.scss',
  templateUrl: './message-list.html',
})
export class MessageList {
  private readonly _store = inject(AdminStore);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);
  private readonly _breadcrumb: UiBreadcrumbItem[] = [
    { labelKey: 'admin.areas.hub', path: '/admin' },
    { labelKey: 'admin.areas.messages' },
  ];

  private readonly _heading = viewChild.required('heading', { read: ElementRef<HTMLElement> });

  constructor() {
    this._store.resetMutations();
  }

  private async _toggleRead(message: ReceivedMessage): Promise<void> {
    await this._store.setRead(message.id, !message.read);
  }

  /** Answering means the message has been read. The mail program opens through the link. */
  private async _reply(message: ReceivedMessage): Promise<void> {
    if (!message.read) {
      await this._store.setRead(message.id, true);
    }
  }

  private async _remove(message: ReceivedMessage): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('messageList.deleteHeading', { name: message.name }),
      description: this._i18n.translate('messageList.deleteDescription'),
      confirmLabel: this._i18n.translate('messageList.deleteConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.deleteMessage(message.id))) {
      this._toast.success(this._i18n.translate('messageList.deleted'));
      // The card that held the focus is gone.
      this._heading().nativeElement.focus();
    }
  }
}
