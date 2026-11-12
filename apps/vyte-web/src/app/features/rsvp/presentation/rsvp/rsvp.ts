import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
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
import { form, FormField, FormRoot, max, maxLength, min, required } from '@angular/forms/signals';
import { injectResponseStatus } from '@core/http/response-status';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import {
  FormRadioGroup,
  FormRadioOption,
} from '@shared/form-controls/form-radio-group/form-radio-group';
import { FormStepper } from '@shared/form-controls/form-stepper/form-stepper';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { RsvpStore } from '../../application/rsvp.store';
import {
  GUEST_MESSAGE_MAX_LENGTH,
  InvitationImage,
  RsvpAnswer,
  UpcomingInvitation,
} from '../../domain/invitation';
import { hostNames, invitationTime } from '../../domain/invitation-time';
import { RsvpImageDialog, RsvpImageDialogData } from '../rsvp-image-dialog/rsvp-image-dialog';

type Response = RsvpAnswer['response'];

interface AnswerModel {
  response: Response | null;
  companions: number;
  message: string;
}

/**
 * The personal page of a guest on `/rsvp/:token`: the invitation with its form, after answering
 * the thanks with the answer, after the deadline the event without a form, after the event only
 * that it is over.
 */
@Component({
  selector: 'app-rsvp',
  imports: [
    FormField,
    FormRoot,
    NgOptimizedImage,
    NgTemplateOutlet,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormRadioGroup,
    FormStepper,
    FormTextarea,
    UiButton,
    UiIcon,
    UiRichText,
    UiText,
  ],
  styleUrl: './rsvp.scss',
  templateUrl: './rsvp.html',
})
export class Rsvp {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly token = input.required<string>();

  private readonly _store = inject(RsvpStore);
  private readonly _i18n = inject(I18nService);
  private readonly _dialog = inject(UiDialogService);
  private readonly _injector = inject(Injector);

  private readonly _heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly _formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');

  /** The invitation before the event, `undefined` while loading and after the event. */
  private readonly _upcoming = computed((): UpcomingInvitation | undefined => {
    const invitation = this._store.invitation();
    return invitation && !invitation.past ? invitation : undefined;
  });

  /** "Antwort ändern" shows the form again over the thanks. */
  private readonly _editing = signal(false);
  private readonly _answered = computed(() => {
    const response = this._upcoming()?.guest.response;
    return response !== undefined && response !== 'pending';
  });
  private readonly _showThanks = computed(() => this._answered() && !this._editing());
  private readonly _showForm = computed(
    () => (this._upcoming()?.open ?? false) && (!this._answered() || this._editing()),
  );

  private readonly _hosts = computed(() => {
    const hosts = this._upcoming()?.event.hosts ?? [];
    return hosts.length > 0 ? hostNames(hosts, this._i18n.locale()) : undefined;
  });

  /** German and English conjugate for one host differently than for several. */
  private readonly _oneHost = computed(() => this._upcoming()?.event.hosts.length === 1);

  private readonly _time = computed(() => {
    const event = this._upcoming()?.event;
    return event && invitationTime(event, this._i18n.locale());
  });

  private readonly _cover = computed(() => this._upcoming()?.event.images[0]);
  private readonly _gallery = computed(() => this._upcoming()?.event.images.slice(1) ?? []);

  /** A search on OpenStreetMap. Nothing is loaded from there until the link is followed. */
  private readonly _mapUrl = computed(() => {
    const address = this._upcoming()?.event.address;
    return address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
      : undefined;
  });
  private readonly _calendarUrl = computed(() => this._store.calendarUrl());

  /** Answers are open until the deadline, or until the start without one. */
  private readonly _until = computed(() => {
    const event = this._upcoming()?.event;
    return event && (event.rsvpDeadline ?? event.startsAt);
  });

  /** Computed, so the labels follow the language. */
  private readonly _responses = computed<FormRadioOption<Response>[]>(() => [
    { value: 'accepted', label: this._i18n.translate('rsvp.form.accepted') },
    { value: 'declined', label: this._i18n.translate('rsvp.form.declined') },
  ]);

  private readonly _model = signal<AnswerModel>({ response: null, companions: 0, message: '' });
  private readonly _maxCompanions = computed(() => this._upcoming()?.guest.maxCompanions ?? 0);
  private readonly _bringsCompanions = computed(
    () => this._model().response === 'accepted' && this._maxCompanions() > 0,
  );
  private readonly _sending = computed(() => this._store.answerState().loadingState === 'loading');

  private readonly _answerForm = form(
    this._model,
    (path) => {
      const t = this._i18n;
      required(path.response, { message: () => t.translate('rsvp.form.responseRequired') });
      // Bounds of the stepper.
      min(path.companions, 0);
      max(path.companions, () => this._maxCompanions());
      maxLength(path.message, GUEST_MESSAGE_MAX_LENGTH, {
        message: () => t.translate('rsvp.form.messageTooLong', { max: GUEST_MESSAGE_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._send() } },
  );

  private readonly _setResponseStatus = injectResponseStatus();

  constructor() {
    effect(() => this._store.select(this.token()));
    // `app-async-content` would set it, but the page shows its own message for this case.
    effect(() => {
      if (this._store.invitationState().failure?.kind === 'not-found') {
        this._setResponseStatus(404);
      }
    });
    injectPageSeo(() => {
      const invitation = this._store.invitation();
      return invitation && { title: invitation.event.title };
    });
  }

  private _imageUrl(image: InvitationImage): string {
    return this._store.imageUrl(image.id) ?? '';
  }

  /** Fills the form with the answer so far, so changing starts from it. */
  private _edit(): void {
    const guest = this._upcoming()?.guest;
    if (!guest) {
      return;
    }
    this._model.set({
      response: guest.response === 'pending' ? null : guest.response,
      companions: guest.companions,
      message: guest.message ?? '',
    });
    this._answerForm().reset();
    this._store.resetAnswer();
    this._editing.set(true);
    // The form is what the guest asked for, further down the page.
    afterNextRender(() => this._formHeading()?.nativeElement.focus(), { injector: this._injector });
  }

  private _cancelEdit(): void {
    this._editing.set(false);
    this._focusHeading();
  }

  private async _send(): Promise<void> {
    const { response, companions, message } = this._model();
    if (!response) {
      return;
    }
    const saved = await this._store.answer({ response, companions, message });
    if (saved) {
      this._editing.set(false);
      // The page changed from the form to the thanks. Its focused heading tells what happened,
      // a toast would only say the same twice.
      this._focusHeading();
    }
  }

  private _openImage(image: InvitationImage, number: number, total: number): void {
    this._dialog.open<void, RsvpImageDialogData>(RsvpImageDialog, {
      data: {
        src: this._imageUrl(image),
        width: image.width,
        height: image.height,
        number,
        total,
      },
    });
  }

  private _focusHeading(): void {
    afterNextRender(() => this._heading()?.nativeElement.focus(), { injector: this._injector });
  }
}
