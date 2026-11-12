import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormDate } from '@shared/form-controls/form-date/form-date';
import { FormFiles } from '@shared/form-controls/form-files/form-files';
import { FormRichText } from '@shared/form-controls/form-rich-text/form-rich-text';
import { FormSwitch } from '@shared/form-controls/form-switch/form-switch';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiAlert } from '@shared/ui/alert/alert';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_TYPES,
  EVENT_IMAGES_MAX,
  EVENT_LOCATION_NAME_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  EventImage,
} from '../../domain/event';
import {
  browserTimeZone,
  emptyEventFormModel,
  EventFormModel,
  toEventDraft,
  toEventFormModel,
  toEventTimes,
} from '../../domain/event-times';

/** The form plus the images that are uploaded once the event itself is saved. */
interface EventEditorModel extends EventFormModel {
  newImages: File[];
}

/** Creates an event on `/events/new` and edits one on `/events/:id/edit`. */
@Component({
  selector: 'app-event-editor',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormDate,
    FormFiles,
    FormRichText,
    FormSwitch,
    FormText,
    FormTextarea,
    UiAlert,
    UiAttachmentImports,
    UiBreadcrumb,
    UiButton,
    UiIcon,
    UiText,
  ],
  styleUrl: './event-editor.scss',
  templateUrl: './event-editor.html',
})
export class EventEditor {
  /** Route parameter, bound through `withComponentInputBinding()`. Missing when creating. */
  readonly id = input<string>();

  private readonly _store = inject(EventsStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);

  private readonly _imagesMax = EVENT_IMAGES_MAX;
  private readonly _imageTypes = EVENT_IMAGE_TYPES;
  private readonly _imageMaxBytes = EVENT_IMAGE_MAX_BYTES;
  private readonly _imageMaxMegabytes = EVENT_IMAGE_MAX_BYTES / (1024 * 1024);

  private readonly _isEdit = computed(() => this.id() !== undefined);
  private readonly _saving = computed(
    () =>
      this._store.mutationState().loadingState === 'loading' ||
      this._store.imageMutationState().loadingState === 'loading',
  );
  private readonly _imagesBusy = computed(
    () => this._store.imageMutationState().loadingState === 'loading',
  );

  /**
   * Set once a new event is created. If the upload of its images fails then, the page stays open
   * and saving again updates that event instead of creating a second one.
   */
  private readonly _createdId = signal<string | undefined>(undefined);
  /** Decides which heading a failed image request gets. */
  private readonly _imageAction = signal<'upload' | 'remove' | 'move'>('upload');
  /** Read out after a move, the buttons alone only change their labels. */
  private readonly _moveStatus = signal('');

  /**
   * The event being edited. Compared by id, so changing one of its images does not count as a
   * new event, which would reset what the user typed.
   */
  private readonly _event = computed(() => (this._isEdit() ? this._store.selected() : undefined), {
    equal: (a, b) => a?.id === b?.id,
  });
  private readonly _past = computed(() => this._event()?.past ?? false);
  private readonly _images = computed(() =>
    this._isEdit() ? (this._store.selected()?.images ?? []) : [],
  );
  private readonly _freeImages = computed(() => EVENT_IMAGES_MAX - this._images().length);

  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => {
    const events: UiBreadcrumbItem = { labelKey: 'events.breadcrumb', path: '/events' };
    const id = this.id();
    if (!id) {
      return [events, { labelKey: 'eventEditor.titleNew' }];
    }
    const title = this._store.selected()?.title;
    const edit: UiBreadcrumbItem = { labelKey: 'eventEditor.breadcrumbEdit' };
    // The title is missing while the event loads, the trail is shorter until then.
    return title ? [events, { label: title, path: `/events/${id}` }, edit] : [events, edit];
  });

  /** Starts empty and is replaced by the loaded event once it arrives. */
  private readonly _model = linkedSignal<EventEditorModel>(() => {
    const event = this._event();
    return { ...(event ? toEventFormModel(event) : emptyEventFormModel()), newImages: [] };
  });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _eventForm = form(
    this._model,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      const t = this._i18n;
      required(path.title, {
        message: () => t.translate('eventEditor.validation.titleRequired'),
      });
      pattern(path.title, /\S/, {
        message: () => t.translate('eventEditor.validation.titleBlank'),
      });
      maxLength(path.title, EVENT_TITLE_MAX_LENGTH, {
        message: () =>
          t.translate('eventEditor.validation.titleTooLong', { max: EVENT_TITLE_MAX_LENGTH }),
      });
      maxLength(path.description, EVENT_DESCRIPTION_MAX_LENGTH, {
        message: () => t.translate('eventEditor.validation.descriptionTooLong'),
      });
      maxLength(path.locationName, EVENT_LOCATION_NAME_MAX_LENGTH, {
        message: () =>
          t.translate('eventEditor.validation.locationTooLong', {
            max: EVENT_LOCATION_NAME_MAX_LENGTH,
          }),
      });
      maxLength(path.address, EVENT_ADDRESS_MAX_LENGTH, {
        message: () =>
          t.translate('eventEditor.validation.addressTooLong', { max: EVENT_ADDRESS_MAX_LENGTH }),
      });
      required(path.startDate, {
        message: () => t.translate('eventEditor.validation.startDateRequired'),
      });
      required(path.startTime, {
        message: () => t.translate('eventEditor.validation.startTimeRequired'),
        when: ({ valueOf }) => !valueOf(path.allDay),
      });
      required(path.endTime, {
        message: () => t.translate('eventEditor.validation.endTimeRequired'),
        when: ({ valueOf }) => !valueOf(path.allDay) && valueOf(path.endDate) !== null,
      });
      // The same order the API checks, so the form reports it before sending.
      validate(path.endDate, ({ valueOf }) => {
        const times = toEventTimes(valueOf(path));
        return times?.endsAt && times.endsAt < times.startsAt
          ? {
              kind: 'endBeforeStart',
              message: t.translate('eventEditor.validation.endBeforeStart'),
            }
          : undefined;
      });
      validate(path.deadlineDate, ({ valueOf }) => {
        const times = toEventTimes(valueOf(path));
        return times?.rsvpDeadline && times.rsvpDeadline > times.startsAt
          ? {
              kind: 'deadlineAfterStart',
              message: t.translate('eventEditor.validation.deadlineAfterStart'),
            }
          : undefined;
      });
    },
    { submission: { action: () => this._save() } },
  );

  constructor() {
    effect(() => this._store.select(this.id()));
  }

  private async _save(): Promise<void> {
    const { newImages, ...model } = this._model();
    const id = this.id() ?? this._createdId();
    // A new event takes the zone of the browser, an existing one keeps its own.
    const draft = toEventDraft(model, this._event()?.timeZone ?? browserTimeZone());
    const saved = id ? await this._store.update(id, draft) : await this._store.create(draft);
    if (!saved) {
      return;
    }
    this._createdId.set(saved.id);

    // The backend takes images only for an existing event, hence the second request.
    if (newImages.length > 0) {
      this._imageAction.set('upload');
      if (!(await this._store.uploadImages(saved.id, newImages))) {
        return;
      }
    }
    this._toast.success(this._i18n.translate('eventEditor.saved'));
    await this._router.navigate(['/events', saved.id]);
  }

  /**
   * Swaps an image with its neighbour. Saved right away, like deleting an image. The buttons stay
   * enabled while a request runs, a disabled button would drop the focus, so a second click is
   * ignored here instead.
   */
  private async _move(index: number, step: -1 | 1): Promise<void> {
    const id = this.id();
    const images = [...this._images()];
    const target = index + step;
    if (!id || this._imagesBusy() || target < 0 || target >= images.length) {
      return;
    }
    [images[index], images[target]] = [images[target]!, images[index]!];
    this._imageAction.set('move');
    if (await this._store.reorderImages(id, images)) {
      const moved = images[target]!.id;
      this._moveStatus.set(
        this._i18n.translate('eventEditor.images.moved', { number: target + 1 }),
      );
      afterNextRender(() => this._focusMoveButton(moved, step), { injector: this._injector });
    }
  }

  /**
   * `FormRoot` marks every field as touched on a submit and runs the action only for a valid form.
   * When it was not, the errors appear all at once, so the focus goes to the first of them.
   */
  private _focusFirstInvalid(): void {
    afterNextRender(
      () => {
        if (this._eventForm().invalid()) {
          this._host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        }
      },
      { injector: this._injector },
    );
  }

  /**
   * The removed image takes its buttons with it. The focus goes to the image that took its place,
   * the one before it, or to the field for new images once none is left.
   */
  private _focusAfterRemoval(index: number): void {
    const host = this._host.nativeElement;
    const items = host.querySelectorAll<HTMLElement>('.event-editor__image');
    const item = items[index] ?? items[index - 1];
    (
      item?.querySelector<HTMLElement>('button') ??
      host.querySelector<HTMLElement>('app-form-files input')
    )?.focus();
  }

  /**
   * Keeps the focus on the image that moved: on the button of the same direction, or on the other
   * one once it reached the end of the row and that button is disabled.
   */
  private _focusMoveButton(imageId: string, step: -1 | 1): void {
    const [earlier, later] = Array.from(
      this._host.nativeElement.querySelectorAll<HTMLButtonElement>(
        `[data-move-image="${imageId}"]`,
      ),
    );
    const [preferred, other] = step < 0 ? [earlier, later] : [later, earlier];
    (preferred && !preferred.disabled ? preferred : other)?.focus();
  }

  /** Deletes right away, unlike the other fields an image does not wait for "save". */
  private async _removeImage(image: EventImage, number: number): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('eventEditor.images.removeHeading', { number }),
      description: this._i18n.translate('eventEditor.images.removeDescription'),
      confirmLabel: this._i18n.translate('eventEditor.images.removeConfirm'),
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    this._imageAction.set('remove');
    if (await this._store.removeImage(id, image.id)) {
      this._toast.success(this._i18n.translate('eventEditor.images.removed'));
      afterNextRender(() => this._focusAfterRemoval(number - 1), { injector: this._injector });
    }
  }
}
