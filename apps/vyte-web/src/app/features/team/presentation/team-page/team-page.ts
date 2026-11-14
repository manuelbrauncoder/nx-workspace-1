import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiAlert } from '@shared/ui/alert/alert';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiListImports } from '@shared/ui/list/list';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { TeamStore } from '../../application/team.store';
import { inviteLinkUrl } from '../../domain/invite-link';
import { EditorInvite, Member } from '../../domain/team';
import { EditorInviteItem } from '../editor-invite-item/editor-invite-item';
import { MemberRow } from '../member-row/member-row';

/**
 * The team of an event on `/events/:id/team`: every member, and for the owner the invite links,
 * handing the event over and removing editors. An editor can leave the event here.
 */
@Component({
  selector: 'app-team-page',
  imports: [
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiAlert,
    UiButton,
    UiIcon,
    UiListImports,
    UiText,
    EditorInviteItem,
    MemberRow,
  ],
  styleUrl: './team-page.scss',
  templateUrl: './team-page.html',
})
export class TeamPage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(TeamStore);
  private readonly _config = inject(AppConfigService);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _router = inject(Router);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  private readonly _membersHeading = viewChild<ElementRef<HTMLElement>>('membersHeading');
  private readonly _invitesHeading = viewChild<ElementRef<HTMLElement>>('invitesHeading');

  /** Set in the browser only, the server cannot know whether the device shares. */
  private readonly _canShare = signal(false);

  private readonly _past = computed(() => this._store.event()?.past ?? false);
  /** Inviting, handing over and removing editors end with the event, leaving does not. */
  private readonly _manages = computed(() => this._store.isOwner() && !this._past());
  // Revoking runs through the same state in the store, the button must not spin then.
  private readonly _creating = signal(false);
  private readonly _leaving = signal(false);

  constructor() {
    effect(() => this._store.select(this.id()));
    injectPageSeo(() => {
      const event = this._store.event();
      return event && { title: this._i18n.translate('teamPage.titleFor', { title: event.title }) };
    });
    afterNextRender(() => this._canShare.set(typeof navigator.share === 'function'));
  }

  private _name(member: Member): string {
    return member.name ?? member.email;
  }

  private _url(invite: EditorInvite): string {
    return inviteLinkUrl(this._config.siteUrl, invite.token);
  }

  private async _createInvite(): Promise<void> {
    this._creating.set(true);
    const invite = await this._store.createInvite();
    this._creating.set(false);
    if (!invite) {
      return;
    }
    this._toast.success(this._i18n.translate('teamPage.invites.createdToast'));
    // The new link is the one to copy next.
    afterNextRender(
      () =>
        this._host.nativeElement
          .querySelector<HTMLElement>(`[data-invite="${invite.id}"] button`)
          ?.focus(),
      { injector: this._injector },
    );
  }

  private async _copy(invite: EditorInvite): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._url(invite));
      this._toast.success(this._i18n.translate('teamPage.invites.copied'));
    } catch {
      this._toast.error(this._i18n.translate('teamPage.invites.copyFailed'));
    }
  }

  private async _share(invite: EditorInvite): Promise<void> {
    const title = this._store.event()?.title ?? '';
    try {
      await navigator.share({
        title,
        text: this._i18n.translate('teamPage.invites.shareText', { title }),
        url: this._url(invite),
      });
    } catch (error) {
      // Closing the share sheet is no failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this._toast.error(this._i18n.translate('teamPage.invites.shareFailed'));
      }
    }
  }

  private async _revoke(invite: EditorInvite): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('teamPage.invites.revokeHeading'),
      description: this._i18n.translate('teamPage.invites.revokeDescription'),
      confirmLabel: this._i18n.translate('teamPage.invites.revokeConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.revokeInvite(invite.id))) {
      this._toast.success(this._i18n.translate('teamPage.invites.revoked'));
      // The item that held the focus is gone.
      this._invitesHeading()?.nativeElement.focus();
    }
  }

  private async _handOver(member: Member): Promise<void> {
    const name = this._name(member);
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('teamPage.members.handOverHeading', { name }),
      description: this._i18n.translate('teamPage.members.handOverDescription', { name }),
      confirmLabel: this._i18n.translate('teamPage.members.handOverConfirm'),
    });
    if (confirmed && (await this._store.handOver(member.userId))) {
      this._toast.success(this._i18n.translate('teamPage.members.handedOver', { name }));
      // The menu that held the focus is gone, the signed-in user is an editor now.
      this._membersHeading()?.nativeElement.focus();
    }
  }

  private async _remove(member: Member): Promise<void> {
    const name = this._name(member);
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('teamPage.members.removeHeading', { name }),
      description: this._i18n.translate('teamPage.members.removeDescription'),
      confirmLabel: this._i18n.translate('teamPage.members.removeConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.removeMember(member.userId))) {
      this._toast.success(this._i18n.translate('teamPage.members.removed', { name }));
      // The card that held the focus is gone.
      this._membersHeading()?.nativeElement.focus();
    }
  }

  private async _leave(): Promise<void> {
    const title = this._store.event()?.title ?? '';
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('teamPage.leave.heading', { title }),
      description: this._i18n.translate('teamPage.leave.description'),
      confirmLabel: this._i18n.translate('teamPage.leave.confirm'),
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    this._leaving.set(true);
    const left = await this._store.leave();
    this._leaving.set(false);
    if (left) {
      this._toast.success(this._i18n.translate('teamPage.leave.done', { title }));
      await this._router.navigate(['/events']);
    }
  }
}
