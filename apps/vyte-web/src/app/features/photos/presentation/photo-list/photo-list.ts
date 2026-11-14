import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { PhotosStore } from '../../application/photos.store';
import { Photo } from '../../domain/photo';
import { PhotoCard } from '../photo-card/photo-card';
import { PhotoDialog, PhotoDialogData } from '../photo-dialog/photo-dialog';

/** How many photos load at once, the rest when scrolled to. */
const EAGER_PHOTOS = 6;

/**
 * The photos of an event for its hosts on `/events/:id/photos`: every photo with who took it,
 * newest first. Open one large, hide or show it, delete it, download the visible ones as a ZIP.
 */
@Component({
  selector: 'app-photo-list',
  imports: [
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiButton,
    UiEmpty,
    UiIcon,
    UiText,
    PhotoCard,
  ],
  styleUrl: './photo-list.scss',
  templateUrl: './photo-list.html',
})
export class PhotoList {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(PhotosStore);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);
  private readonly _dialog = inject(UiDialogService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);

  private readonly _listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');
  private readonly _eager = EAGER_PHOTOS;
  /** The photo whose hiding or showing is being saved, so a second press does not repeat it. */
  private readonly _saving = signal<string | undefined>(undefined);

  constructor() {
    effect(() => this._store.select(this.id()));
    injectPageSeo(() => {
      const event = this._store.event();
      return event && { title: this._i18n.translate('photoList.titleFor', { title: event.title }) };
    });
  }

  private _src(photo: Photo): string {
    return this._store.photoUrl(photo.id) ?? '';
  }

  private _name(photo: Photo): string {
    return photo.uploaderName ?? this._i18n.translate('photoList.card.noName');
  }

  private _open(photo: Photo): void {
    this._dialog.open<void, PhotoDialogData>(PhotoDialog, {
      data: {
        src: this._src(photo),
        width: photo.width,
        height: photo.height,
        heading: this._i18n.translate('photoList.dialog.heading', { name: this._name(photo) }),
        description: this._i18n.translate('photoList.dialog.description', {
          source: this._i18n.translate(
            photo.source === 'guest' ? 'photoList.card.placeCard' : 'photoList.card.stand',
          ),
          date: formatLocalDate(photo.createdAt, this._i18n.locale(), 'dateTime', APP_TIME_ZONE),
        }),
      },
    });
  }

  private async _toggleHidden(photo: Photo): Promise<void> {
    if (this._saving()) {
      return;
    }
    this._saving.set(photo.id);
    const saved = await this._store.setHidden(photo.id, !photo.hidden);
    this._saving.set(undefined);
    if (saved) {
      this._toast.success(
        this._i18n.translate(saved.hidden ? 'photoList.hiddenToast' : 'photoList.shownToast'),
      );
    }
  }

  private async _remove(photo: Photo): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('photoList.remove.heading', { name: this._name(photo) }),
      description: this._i18n.translate('photoList.remove.description'),
      confirmLabel: this._i18n.translate('photoList.remove.confirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.remove(photo.id))) {
      this._toast.success(this._i18n.translate('photoList.remove.done'));
      // The card that held the focus is gone.
      this._listHeading()?.nativeElement.focus();
    }
  }
}
