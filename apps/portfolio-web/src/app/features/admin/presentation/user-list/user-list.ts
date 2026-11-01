import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AuthStore } from '@features/auth/public-api';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AdminStore } from '../../application/admin.store';
import { User } from '../../domain/admin';
import { UserCard } from '../user-card/user-card';

/** Every account on `/admin/users`, with admin rights, sign-out on all devices and deletion. */
@Component({
  selector: 'app-user-list',
  imports: [TranslatePipe, AsyncContent, FailureAlert, UiBreadcrumb, UiText, UserCard],
  styleUrl: './user-list.scss',
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly _store = inject(AdminStore);
  private readonly _auth = inject(AuthStore);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);
  private readonly _breadcrumb: UiBreadcrumbItem[] = [
    { labelKey: 'admin.areas.hub', path: '/admin' },
    { labelKey: 'admin.areas.users' },
  ];

  private readonly _heading = viewChild.required('heading', { read: ElementRef<HTMLElement> });

  constructor() {
    this._store.resetMutations();
  }

  private _name(user: User): string {
    return user.name ?? user.email;
  }

  private async _toggleRole(user: User): Promise<void> {
    const role = user.role === 'admin' ? 'user' : 'admin';
    if (await this._store.setRole(user.id, role)) {
      this._toast.success(
        this._i18n.translate(role === 'admin' ? 'userList.madeAdmin' : 'userList.removedAdmin', {
          name: this._name(user),
        }),
      );
    }
  }

  private async _revokeSessions(user: User): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('userList.revokeHeading', { name: this._name(user) }),
      description: this._i18n.translate('userList.revokeDescription'),
      confirmLabel: this._i18n.translate('userList.revokeConfirm'),
    });
    if (confirmed && (await this._store.revokeSessions(user.id))) {
      this._toast.success(this._i18n.translate('userList.revoked', { name: this._name(user) }));
    }
  }

  private async _remove(user: User): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('userList.deleteHeading', { name: this._name(user) }),
      description: this._i18n.translate('userList.deleteDescription'),
      confirmLabel: this._i18n.translate('userList.deleteConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.deleteUser(user.id))) {
      this._toast.success(this._i18n.translate('userList.deleted', { name: this._name(user) }));
      // The card that held the focus is gone.
      this._heading().nativeElement.focus();
    }
  }
}
