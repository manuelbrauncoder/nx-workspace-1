import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { injectResponseStatus } from '@core/http/response-status';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiSpinner } from '@shared/ui/spinner/spinner';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { QueuedPhoto, UploadStore } from '../../application/upload.store';
import { OwnPhoto, PHOTO_TYPES, PHOTO_UPLOADER_NAME_MAX_LENGTH } from '../../domain/upload';

/**
 * The upload page of a guest (`/photos/:token`, the QR code of their place card) or of the
 * photo stand (`/stand/:token`): choose photos, watch them go up one after the other, see and
 * delete the own ones. Only during the upload window; before and after it says when.
 */
@Component({
  selector: 'app-upload-page',
  imports: [
    FormField,
    NgOptimizedImage,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormText,
    UiButton,
    UiIcon,
    UiSpinner,
    UiText,
  ],
  styleUrl: './upload-page.scss',
  templateUrl: './upload-page.html',
})
export class UploadPage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly token = input.required<string>();
  /** From the route data: the page of a guest or the one of the stand. */
  readonly kind = input.required<'guest' | 'stand'>();

  private readonly _store = inject(UploadStore);
  private readonly _i18n = inject(I18nService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _setResponseStatus = injectResponseStatus();
  private readonly _document = inject(DOCUMENT);
  private readonly _injector = inject(Injector);

  private readonly _timeZone = APP_TIME_ZONE;
  private readonly _accept = PHOTO_TYPES.join(',');
  private readonly _notFound = computed(
    () => this._store.uploadState().failure?.kind === 'not-found',
  );

  /** Whether the window has not opened yet; after it, the upload is over. */
  private readonly _beforeWindow = computed(() => {
    const upload = this._store.upload();
    return upload !== undefined && !upload.open && Date.now() < upload.opensAt.getTime();
  });

  /** One dot per photo the visitor may upload, the used ones filled. Decoration only. */
  private readonly _dots = computed(() => {
    const upload = this._store.upload();
    return upload
      ? Array.from({ length: upload.limit }, (_, index) => index < upload.limit - upload.left)
      : [];
  });

  /** Said politely after choosing or uploading, e.g. that photos were left out. */
  private readonly _notice = signal('');

  /** The name a visitor of the stand may give, so the hosts know who took the photos. */
  private readonly _person = signal({ name: '' });
  private readonly _personForm = form(this._person, (path) => {
    maxLength(path.name, PHOTO_UPLOADER_NAME_MAX_LENGTH, {
      message: () =>
        this._i18n.translate('uploadPage.nameTooLong', { max: PHOTO_UPLOADER_NAME_MAX_LENGTH }),
    });
  });

  constructor() {
    effect(() => this._store.select({ kind: this.kind(), token: this.token() }));
    // `app-async-content` would set it, but the page shows its own message for this case.
    effect(() => {
      if (this._notFound()) {
        this._setResponseStatus(404);
      }
    });
    injectPageSeo(() => {
      const upload = this._store.upload();
      return (
        upload && {
          title: this._i18n.translate('uploadPage.titleFor', { title: upload.eventTitle }),
        }
      );
    });
  }

  /** A name over the limit would be refused with every photo, so it blocks the choice. */
  private _name(): string | undefined {
    if (this.kind() !== 'stand') {
      return '';
    }
    if (!this._personForm().valid()) {
      this._personForm.name().markAsTouched();
      return undefined;
    }
    return this._person().name;
  }

  private _choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    // The same files may be chosen again, e.g. after discarding a failed one.
    input.value = '';
    const name = this._name();
    if (files.length === 0 || name === undefined) {
      return;
    }
    const picked = this._store.add(files, name);
    // The picker goes once nothing is left, it held the focus: the list of photos takes it.
    if (this._store.free() === 0) {
      this._focusOwnPhotos();
    }
    const parts = [
      picked.accepted.length > 0
        ? this._i18n.translate('uploadPage.queued', { count: picked.accepted.length })
        : '',
      picked.overLimit.length > 0
        ? this._i18n.translate('uploadPage.overLimit', { count: picked.overLimit.length })
        : '',
      picked.wrongType.length > 0
        ? this._i18n.translate('uploadPage.wrongType', { count: picked.wrongType.length })
        : '',
    ];
    this._notice.set(parts.filter(Boolean).join(' '));
  }

  private _retry(item: QueuedPhoto): void {
    const name = this._name();
    if (name !== undefined) {
      this._store.retry(item.id, name);
      // The buttons of the failed tile are gone.
      this._focusOwnPhotos();
    }
  }

  private _discard(item: QueuedPhoto): void {
    this._store.discard(item.id);
    this._notice.set(this._i18n.translate('uploadPage.queue.discarded', { name: item.file.name }));
    this._focusOwnPhotos();
  }

  private _focusOwnPhotos(): void {
    afterNextRender(() => this._document.getElementById('upload-page-own')?.focus(), {
      injector: this._injector,
    });
  }

  private _photoUrl(photo: OwnPhoto): string {
    return this._store.photoUrl(photo.id) ?? '';
  }

  private async _delete(photo: OwnPhoto, number: number): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('uploadPage.delete.heading', { number }),
      description: this._i18n.translate('uploadPage.delete.description'),
      confirmLabel: this._i18n.translate('uploadPage.delete.confirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.deletePhoto(photo.id))) {
      this._notice.set(this._i18n.translate('uploadPage.delete.done', { number }));
      // The photo that held the focus is gone, the heading of its list stays.
      this._focusOwnPhotos();
    }
  }
}
