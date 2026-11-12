import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AuthStore } from '@features/auth/public-api';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AdminStore } from '../../application/admin.store';
import { accountLinkUrl } from '../../domain/account-link';
import { ACCOUNT_INVITE_NAME_MAX_LENGTH, AccountInvite, User } from '../../domain/admin';
import { AccountInviteItem } from '../account-invite-item/account-invite-item';
import { UserCard } from '../user-card/user-card';

/**
 * `/admin/users`: creates account links, lists the open ones and every account. Sign-up is
 * closed, so a link from here is how a host gets an account.
 */
@Component({
  selector: 'app-user-list',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormText,
    UiButton,
    UiText,
    AccountInviteItem,
    UserCard,
  ],
  styleUrl: './user-list.scss',
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly _store = inject(AdminStore);
  private readonly _auth = inject(AuthStore);
  private readonly _config = inject(AppConfigService);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  private readonly _invitesHeading = viewChild.required('invitesHeading', {
    read: ElementRef<HTMLElement>,
  });
  private readonly _usersHeading = viewChild.required('usersHeading', {
    read: ElementRef<HTMLElement>,
  });

  private readonly _creating = computed(() => this._store.createState().loadingState === 'loading');

  private readonly _newInvite = signal({ name: '' });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _createForm = form(
    this._newInvite,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      const t = this._i18n;
      required(path.name, { message: () => t.translate('userList.create.nameRequired') });
      pattern(path.name, /\S/, { message: () => t.translate('userList.create.nameBlank') });
      maxLength(path.name, ACCOUNT_INVITE_NAME_MAX_LENGTH, {
        message: () =>
          t.translate('userList.create.nameTooLong', { max: ACCOUNT_INVITE_NAME_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._create() } },
  );

  constructor() {
    this._store.resetMutations();
  }

  private _url(invite: AccountInvite): string {
    return accountLinkUrl(this._config.siteUrl, invite.token);
  }

  private _name(user: User): string {
    return user.name ?? user.email;
  }

  private async _create(): Promise<void> {
    const invite = await this._store.createInvite(this._newInvite().name.trim());
    if (!invite) {
      return;
    }
    this._toast.success(this._i18n.translate('userList.create.created', { name: invite.name }));
    // Ready for the next one, without the errors of an empty field.
    this._newInvite.set({ name: '' });
    this._createForm().reset();
    // The new link is the one to copy next.
    afterNextRender(
      () =>
        this._host.nativeElement
          .querySelector<HTMLElement>(`[data-invite="${invite.id}"] button`)
          ?.focus(),
      { injector: this._injector },
    );
  }

  private async _copy(invite: AccountInvite): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._url(invite));
      this._toast.success(this._i18n.translate('userList.invites.copied'));
    } catch {
      this._toast.error(this._i18n.translate('userList.invites.copyFailed'));
    }
  }

  private async _revoke(invite: AccountInvite): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('userList.invites.revokeHeading', { name: invite.name }),
      description: this._i18n.translate('userList.invites.revokeDescription'),
      confirmLabel: this._i18n.translate('userList.invites.revokeConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.revokeInvite(invite.id))) {
      this._toast.success(this._i18n.translate('userList.invites.revoked', { name: invite.name }));
      // The item that held the focus is gone.
      this._invitesHeading().nativeElement.focus();
    }
  }

  private async _toggleRole(user: User): Promise<void> {
    const role = user.role === 'admin' ? 'user' : 'admin';
    if (await this._store.setRole(user.id, role)) {
      this._toast.success(
        this._i18n.translate(
          role === 'admin' ? 'userList.users.madeAdmin' : 'userList.users.removedAdmin',
          { name: this._name(user) },
        ),
      );
    }
  }

  private async _revokeSessions(user: User): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('userList.users.revokeHeading', { name: this._name(user) }),
      description: this._i18n.translate('userList.users.revokeDescription'),
      confirmLabel: this._i18n.translate('userList.users.revokeConfirm'),
    });
    if (confirmed && (await this._store.revokeSessions(user.id))) {
      this._toast.success(
        this._i18n.translate('userList.users.revoked', { name: this._name(user) }),
      );
    }
  }

  private async _remove(user: User): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('userList.users.deleteHeading', { name: this._name(user) }),
      description: this._i18n.translate('userList.users.deleteDescription'),
      confirmLabel: this._i18n.translate('userList.users.deleteConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.deleteUser(user.id))) {
      this._toast.success(
        this._i18n.translate('userList.users.deleted', { name: this._name(user) }),
      );
      // The card that held the focus is gone.
      this._usersHeading().nativeElement.focus();
    }
  }
}
