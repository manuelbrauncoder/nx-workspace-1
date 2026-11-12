import { Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { WelcomeStore } from '../../application/welcome.store';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  Registration,
} from '../../domain/me';

/**
 * Creates an account from the link an admin sent, on `/welcome/:token`. The name of the link is
 * prefilled. Afterwards the new user is signed in and lands on their events.
 */
@Component({
  selector: 'app-welcome',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormText,
    UiButton,
    UiText,
  ],
  styleUrl: './welcome.scss',
  templateUrl: './welcome.html',
})
export class Welcome {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly token = input.required<string>();

  private readonly _welcome = inject(WelcomeStore);
  private readonly _auth = inject(AuthStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _passwordMin = PASSWORD_MIN_LENGTH;
  private readonly _submitting = computed(
    () => this._auth.mutationState().loadingState === 'loading',
  );

  /** Starts with the name of the link once it is loaded. */
  private readonly _registration = linkedSignal<Registration>(() => ({
    name: this._welcome.invite()?.name ?? '',
    email: '',
    password: '',
  }));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _welcomeForm = form(
    this._registration,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      const t = this._i18n;
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: () => t.translate('welcome.validation.nameTooLong', { max: NAME_MAX_LENGTH }),
      });
      required(path.email, { message: () => t.translate('welcome.validation.emailRequired') });
      email(path.email, { message: () => t.translate('welcome.validation.emailInvalid') });
      required(path.password, {
        message: () => t.translate('welcome.validation.passwordRequired'),
      });
      minLength(path.password, PASSWORD_MIN_LENGTH, {
        message: () =>
          t.translate('welcome.validation.passwordTooShort', { min: PASSWORD_MIN_LENGTH }),
      });
      maxLength(path.password, PASSWORD_MAX_LENGTH, {
        message: () =>
          t.translate('welcome.validation.passwordTooLong', { max: PASSWORD_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._create() } },
  );

  constructor() {
    effect(() => this._welcome.select(this.token()));
    // The store outlives the page, so a failure of an earlier attempt would still be shown.
    this._auth.resetMutation();
  }

  private async _create(): Promise<void> {
    if (await this._auth.acceptAccountInvite(this.token(), this._registration())) {
      this._toast.success(this._i18n.translate('welcome.created'));
      await this._router.navigateByUrl('/events');
    }
  }
}
