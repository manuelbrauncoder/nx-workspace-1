import { booleanAttribute, Component, computed, inject, input, signal } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { Failure } from '@core/failure/failure';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { Media, MEDIA_MAX_BYTES, MEDIA_TYPES } from '../../domain/portfolio';
import { LocalizedField } from '../localized-field/localized-field';
import { MediaPickerData, MediaPickerDialog } from '../media-picker-dialog/media-picker-dialog';
import { ImageForm } from './image-form';

let nextId = 0;

/**
 * An image of a section: a preview, buttons to upload a new file or to choose one from the
 * library, and the alt text in both languages. An upload runs right away, the section only
 * points to the file once it is saved.
 */
@Component({
  selector: 'app-image-field',
  imports: [TranslatePipe, FailureAlert, UiButton, UiIcon, LocalizedField],
  styleUrl: './image-field.scss',
  templateUrl: './image-field.html',
})
export class ImageField {
  readonly field = input.required<FieldTree<ImageForm>>();
  readonly label = input.required<string>();
  /** Offers to remove the image, for a section where it is optional. */
  readonly removable = input(false, { transform: booleanAttribute });

  private readonly _store = inject(PortfolioEditorStore);
  private readonly _dialog = inject(UiDialogService);
  private readonly _i18n = inject(I18nService);

  private readonly _errorId = `image-field-error-${nextId++}`;
  private readonly _accept = MEDIA_TYPES.join(',');
  private readonly _maxMegabytes = MEDIA_MAX_BYTES / (1024 * 1024);

  private readonly _media = computed(() => this.field().media().value());
  private readonly _uploading = signal(false);
  private readonly _uploadFailure = signal<Failure | undefined>(undefined);
  /** Why a chosen file was not uploaded. */
  private readonly _rejection = signal<string | undefined>(undefined);
  private readonly _errorMessages = computed(() => {
    const media = this.field().media();
    const errors = media.touched() ? media.errors().map((error) => error.message ?? '') : [];
    const rejection = this._rejection();
    return rejection ? [rejection, ...errors] : errors;
  });

  private async _upload(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    // Lets the same file be chosen again after a failure.
    fileInput.value = '';
    if (!file) {
      return;
    }
    this._uploadFailure.set(undefined);
    if (!MEDIA_TYPES.includes(file.type)) {
      this._rejection.set(this._i18n.translate('sectionEditor.image.wrongType'));
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      this._rejection.set(
        this._i18n.translate('sectionEditor.image.tooLarge', { size: this._maxMegabytes }),
      );
      return;
    }
    this._rejection.set(undefined);
    this._uploading.set(true);
    const media = await this._store.upload(file);
    this._uploading.set(false);
    if (media) {
      this._select(media);
    } else {
      this._uploadFailure.set(this._store.uploadState().failure);
    }
  }

  private async _choose(): Promise<void> {
    this._store.loadMedia();
    const ref = this._dialog.open<Media, MediaPickerData>(MediaPickerDialog, {
      data: {
        media: this._store.media,
        state: this._store.mediaState,
        retry: () => this._store.loadMedia(),
      },
    });
    const media = await ref.closed;
    if (media) {
      this._rejection.set(undefined);
      this._select(media);
    }
  }

  private _select({ id, url, width, height }: Media): void {
    const media = this.field().media();
    media.value.set({ id, url, width, height });
    media.markAsTouched();
  }

  private _remove(): void {
    this.field().media().value.set(null);
  }
}
