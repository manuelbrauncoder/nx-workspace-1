import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormFiles } from '@shared/form-controls/form-files/form-files';
import { FormRichText } from '@shared/form-controls/form-rich-text/form-rich-text';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { NotesStore } from '../../application/notes.store';
import {
  NOTE_DESCRIPTION_MAX_LENGTH,
  NOTE_IMAGE_MAX_BYTES,
  NOTE_IMAGE_TYPES,
  NOTE_IMAGES_MAX,
  NOTE_TITLE_MAX_LENGTH,
  NoteDraft,
  NoteImage,
} from '../../domain/note';

/** The draft plus the images that are uploaded once the note itself is saved. */
interface NoteFormModel extends NoteDraft {
  newImages: File[];
}

/** Creates a note on `/notes/new` and edits one on `/notes/:id/edit`. */
@Component({
  selector: 'app-note-editor',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormFiles,
    FormRichText,
    FormText,
    UiAttachmentImports,
    UiButton,
    UiText,
  ],
  styleUrl: './note-editor.scss',
  templateUrl: './note-editor.html',
})
export class NoteEditor {
  /** Route parameter, bound through `withComponentInputBinding()`. Missing when creating. */
  readonly id = input<string>();

  private readonly _store = inject(NotesStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);

  private readonly _imagesMax = NOTE_IMAGES_MAX;
  private readonly _imageTypes = NOTE_IMAGE_TYPES;
  private readonly _imageMaxBytes = NOTE_IMAGE_MAX_BYTES;
  private readonly _imageMaxMegabytes = NOTE_IMAGE_MAX_BYTES / (1024 * 1024);

  private readonly _isEdit = computed(() => this.id() !== undefined);
  private readonly _saving = computed(
    () =>
      this._store.mutationState().loadingState === 'loading' ||
      this._store.imageMutationState().loadingState === 'loading',
  );

  /**
   * Set once a new note is created. If the upload of its images fails then, the page stays open
   * and saving again updates that note instead of creating a second one.
   */
  private readonly _createdId = signal<string | undefined>(undefined);
  /** Decides which heading a failed image request gets. */
  private readonly _imageAction = signal<'upload' | 'remove'>('upload');

  /**
   * The note being edited. Compared by id, so deleting one of its images does not count as a
   * new note, which would reset what the user typed.
   */
  private readonly _note = computed(() => (this._isEdit() ? this._store.selected() : undefined), {
    equal: (a, b) => a?.id === b?.id,
  });
  private readonly _images = computed(() =>
    this._isEdit() ? (this._store.selected()?.images ?? []) : [],
  );
  private readonly _freeImages = computed(() => NOTE_IMAGES_MAX - this._images().length);

  /** Starts empty and is replaced by the loaded note once it arrives. */
  private readonly _model = linkedSignal<NoteFormModel>(() => {
    const note = this._note();
    return { title: note?.title ?? '', description: note?.description ?? '', newImages: [] };
  });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _noteForm = form(
    this._model,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      required(path.title, {
        message: () => this._i18n.translate('noteEditor.validation.titleRequired'),
      });
      pattern(path.title, /\S/, {
        message: () => this._i18n.translate('noteEditor.validation.titleBlank'),
      });
      maxLength(path.title, NOTE_TITLE_MAX_LENGTH, {
        message: () =>
          this._i18n.translate('noteEditor.validation.titleTooLong', {
            max: NOTE_TITLE_MAX_LENGTH,
          }),
      });
      maxLength(path.description, NOTE_DESCRIPTION_MAX_LENGTH, {
        message: () => this._i18n.translate('noteEditor.validation.descriptionTooLong'),
      });
    },
    { submission: { action: () => this._save() } },
  );

  constructor() {
    effect(() => this._store.select(this.id()));
  }

  private async _save(): Promise<void> {
    const { newImages, ...draft } = this._model();
    const id = this.id() ?? this._createdId();
    const saved = id ? await this._store.update(id, draft) : await this._store.create(draft);
    if (!saved) {
      return;
    }
    this._createdId.set(saved.id);

    // The backend takes images only for an existing note, hence the second request.
    if (newImages.length > 0) {
      this._imageAction.set('upload');
      if (!(await this._store.uploadImages(saved.id, newImages))) {
        return;
      }
    }
    this._toast.success(this._i18n.translate('noteEditor.saved'));
    await this._router.navigate(['/notes']);
  }

  /** Deletes right away, unlike the other fields an image does not wait for "save". */
  private async _removeImage(image: NoteImage, number: number): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('noteEditor.images.removeHeading', { number }),
      description: this._i18n.translate('noteEditor.images.removeDescription'),
      confirmLabel: this._i18n.translate('noteEditor.images.removeConfirm'),
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    this._imageAction.set('remove');
    if (await this._store.removeImage(id, image.id)) {
      this._toast.success(this._i18n.translate('noteEditor.images.removed'));
    }
  }
}
