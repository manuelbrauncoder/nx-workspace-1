import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { injectResponseStatus } from '@core/http/response-status';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AuthStore } from '@features/auth/public-api';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { InviteStore } from '../../application/invite.store';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  Registration,
  VyteEvent,
} from '../../domain/invite';

/**
 * The page of an editor invite on `/invite/:token`: who invites to which event. A signed-in
 * user accepts with one click, everyone else signs in and comes back, or creates an account
 * right here. Afterwards the event opens.
 */
@Component({
  selector: 'app-invite-page',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormText,
    UiButton,
    UiText,
  ],
  styleUrl: './invite-page.scss',
  templateUrl: './invite-page.html',
})
export class InvitePage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly token = input.required<string>();

  private readonly _store = inject(InviteStore);
  private readonly _auth = inject(AuthStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);
  private readonly _setResponseStatus = injectResponseStatus();

  private readonly _passwordMin = PASSWORD_MIN_LENGTH;
  private readonly _notFound = computed(
    () => this._store.previewState().failure?.kind === 'not-found',
  );
  private readonly _busy = computed(() => this._store.mutationState().loadingState === 'loading');
  /** Without a name the email stands in. */
  private readonly _meName = computed(() => {
    const me = this._auth.me();
    return me ? (me.name ?? me.email) : undefined;
  });
  /** Comes back here after signing in. */
  private readonly _returnUrl = computed(() => `/invite/${encodeURIComponent(this.token())}`);

  private readonly _registration = signal<Registration>({ name: '', email: '', password: '' });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _signUpForm = form(
    this._registration,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      const t = this._i18n;
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: () => t.translate('invitePage.validation.nameTooLong', { max: NAME_MAX_LENGTH }),
      });
      required(path.email, { message: () => t.translate('invitePage.validation.emailRequired') });
      email(path.email, { message: () => t.translate('invitePage.validation.emailInvalid') });
      required(path.password, {
        message: () => t.translate('invitePage.validation.passwordRequired'),
      });
      minLength(path.password, PASSWORD_MIN_LENGTH, {
        message: () =>
          t.translate('invitePage.validation.passwordTooShort', { min: PASSWORD_MIN_LENGTH }),
      });
      maxLength(path.password, PASSWORD_MAX_LENGTH, {
        message: () =>
          t.translate('invitePage.validation.passwordTooLong', { max: PASSWORD_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._signUp() } },
  );

  constructor() {
    effect(() => this._store.select(this.token()));
    // `app-async-content` would set it, but the page shows its own message for this case.
    effect(() => {
      if (this._notFound()) {
        this._setResponseStatus(404);
      }
    });
    injectPageSeo(() => {
      const preview = this._store.preview();
      return preview && { title: preview.eventTitle };
    });
  }

  private async _accept(): Promise<void> {
    await this._open(await this._store.accept());
  }

  private async _signUp(): Promise<void> {
    await this._open(await this._store.signUp(this._registration()));
  }

  private async _open(event: VyteEvent | undefined): Promise<void> {
    if (event) {
      this._toast.success(this._i18n.translate('invitePage.joined', { title: event.title }));
      await this._router.navigate(['/events', event.id]);
    }
  }
}
