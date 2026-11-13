import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { photoStandUrl } from '../../domain/public-links';

/** Which button started the running request, so only that one shows the spinner. */
type PhotoStandAction = 'enable' | 'renew' | 'disable';

/**
 * The photo stand of an event on its page: one shared upload page for everyone at the event,
 * reached through a printed card. Turn it on, copy or open the link, renew or turn it off. It
 * cannot be turned on after the event; turning it off keeps the photos.
 */
@Component({
  selector: 'app-photo-stand-panel',
  imports: [RouterLink, TranslatePipe, FailureAlert, UiButton, UiIcon, UiText],
  styleUrl: './photo-stand-panel.scss',
  templateUrl: './photo-stand-panel.html',
})
export class PhotoStandPanel {
  readonly event = input.required<VyteEvent>();

  private readonly _store = inject(EventsStore);
  private readonly _config = inject(AppConfigService);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  private readonly _url = computed(() => {
    const stand = this.event().photoStand;
    return stand ? photoStandUrl(this._config.siteUrl, stand.token) : undefined;
  });
  private readonly _running = signal<PhotoStandAction | undefined>(undefined);

  private async _enable(): Promise<void> {
    if (await this._write('enable')) {
      this._toast.success(this._i18n.translate('eventDetail.photoStand.enabled'));
      // Copying the new link is what comes next.
      this._focusLater('.photo-stand__copy');
    }
  }

  private async _renew(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('eventDetail.photoStand.renewHeading'),
      description: this._i18n.translate('eventDetail.photoStand.renewDescription'),
      confirmLabel: this._i18n.translate('eventDetail.photoStand.renewConfirm'),
    });
    if (confirmed && (await this._write('renew'))) {
      this._toast.success(this._i18n.translate('eventDetail.photoStand.renewed'));
    }
  }

  private async _disable(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('eventDetail.photoStand.disableHeading'),
      description: this._i18n.translate('eventDetail.photoStand.disableDescription'),
      confirmLabel: this._i18n.translate('eventDetail.photoStand.disableConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._write('disable'))) {
      this._toast.success(this._i18n.translate('eventDetail.photoStand.disabled'));
      // The buttons that held the focus are gone, the heading of the part stays.
      this._focusLater('#event-detail-photo-stand');
    }
  }

  private async _copy(): Promise<void> {
    const url = this._url();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this._toast.success(this._i18n.translate('eventDetail.photoStand.copied'));
    } catch {
      this._toast.error(this._i18n.translate('eventDetail.photoStand.copyFailed'));
    }
  }

  private async _write(action: PhotoStandAction): Promise<boolean> {
    if (this._running()) {
      return false;
    }
    const id = this.event().id;
    this._running.set(action);
    const result =
      action === 'enable'
        ? await this._store.enablePhotoStand(id)
        : action === 'renew'
          ? await this._store.renewPhotoStandToken(id)
          : await this._store.disablePhotoStand(id);
    this._running.set(undefined);
    return result !== undefined;
  }

  private _focusLater(selector: string): void {
    afterNextRender(
      () => this._host.nativeElement.ownerDocument.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this._injector },
    );
  }
}
