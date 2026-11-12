import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { SAVE_THE_DATE_NOTE_MAX_LENGTH, VyteEvent } from '../../domain/event';
import { saveTheDateUrl } from '../../domain/save-the-date-link';

/** Which button started the running request, so only that one shows the spinner. */
type SaveTheDateAction = 'enable' | 'note' | 'renew' | 'disable';

/**
 * The save-the-date link of an event on its page: turn it on with an optional note, copy, share
 * or open it, change the note, renew or turn it off. After the event it can only be turned off.
 */
@Component({
  selector: 'app-save-the-date-panel',
  imports: [FormField, TranslatePipe, FailureAlert, FormTextarea, UiButton, UiIcon, UiText],
  styleUrl: './save-the-date-panel.scss',
  templateUrl: './save-the-date-panel.html',
})
export class SaveTheDatePanel {
  readonly event = input.required<VyteEvent>();

  private readonly _store = inject(EventsStore);
  private readonly _config = inject(AppConfigService);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  private readonly _link = computed(() => this.event().saveTheDate);
  private readonly _url = computed(() => {
    const link = this._link();
    return link ? saveTheDateUrl(this._config.siteUrl, link.token) : undefined;
  });
  private readonly _running = signal<SaveTheDateAction | undefined>(undefined);

  /** Set in the browser only, the server cannot know whether the device shares. */
  private readonly _canShare = signal(false);

  /** Follows the saved note, so the field shows what the page shows. */
  private readonly _model = linkedSignal(() => ({ note: this._link()?.note ?? '' }));
  private readonly _noteForm = form(this._model, (path) => {
    maxLength(path.note, SAVE_THE_DATE_NOTE_MAX_LENGTH, {
      message: () =>
        this._i18n.translate('eventDetail.saveTheDate.noteTooLong', {
          max: SAVE_THE_DATE_NOTE_MAX_LENGTH,
        }),
    });
  });
  private readonly _noteMax = SAVE_THE_DATE_NOTE_MAX_LENGTH;

  constructor() {
    afterNextRender(() => this._canShare.set(typeof navigator.share === 'function'));
  }

  private async _enable(event: Event): Promise<void> {
    event.preventDefault();
    if (!(await this._write('enable', this._model().note))) {
      return;
    }
    this._toast.success(this._i18n.translate('eventDetail.saveTheDate.enabled'));
    // Copying the new link is what comes next.
    this._focusLater('.save-the-date__copy');
  }

  private async _saveNote(event: Event): Promise<void> {
    event.preventDefault();
    if (await this._write('note', this._model().note)) {
      this._toast.success(this._i18n.translate('eventDetail.saveTheDate.noteSaved'));
    }
  }

  private async _renew(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('eventDetail.saveTheDate.renewHeading'),
      description: this._i18n.translate('eventDetail.saveTheDate.renewDescription'),
      confirmLabel: this._i18n.translate('eventDetail.saveTheDate.renewConfirm'),
    });
    if (confirmed && (await this._write('renew'))) {
      this._toast.success(this._i18n.translate('eventDetail.saveTheDate.renewed'));
    }
  }

  private async _disable(): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('eventDetail.saveTheDate.disableHeading'),
      description: this._i18n.translate('eventDetail.saveTheDate.disableDescription'),
      confirmLabel: this._i18n.translate('eventDetail.saveTheDate.disableConfirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._write('disable'))) {
      this._toast.success(this._i18n.translate('eventDetail.saveTheDate.disabled'));
      // The buttons that held the focus are gone, the heading of the part stays.
      this._focusLater('#event-detail-save-the-date');
    }
  }

  private async _copy(): Promise<void> {
    const url = this._url();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this._toast.success(this._i18n.translate('eventDetail.saveTheDate.copied'));
    } catch {
      this._toast.error(this._i18n.translate('eventDetail.saveTheDate.copyFailed'));
    }
  }

  private async _share(): Promise<void> {
    const url = this._url();
    const event = this.event();
    if (!url) {
      return;
    }
    const date = formatLocalDate(event.startsAt, this._i18n.locale(), 'date', event.timeZone);
    try {
      await navigator.share({
        title: event.title,
        text: this._i18n.translate('eventDetail.saveTheDate.shareText', {
          title: event.title,
          date,
        }),
        url,
      });
    } catch (error) {
      // Closing the share sheet is no failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this._toast.error(this._i18n.translate('eventDetail.saveTheDate.shareFailed'));
      }
    }
  }

  /** Runs one change and remembers which button started it. The note is only sent to set it. */
  private async _write(action: SaveTheDateAction, note = ''): Promise<boolean> {
    if (this._running()) {
      return false;
    }
    // Only these two send the note. Renewing or turning off must work whatever the field holds.
    if ((action === 'enable' || action === 'note') && !this._noteForm().valid()) {
      // Shows the message of the note field and puts the user where it can be fixed.
      this._noteForm.note().markAsTouched();
      this._host.nativeElement.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      return false;
    }
    const id = this.event().id;
    this._running.set(action);
    const result =
      action === 'renew'
        ? await this._store.renewSaveTheDateToken(id)
        : action === 'disable'
          ? await this._store.removeSaveTheDate(id)
          : await this._store.setSaveTheDate(id, note);
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
