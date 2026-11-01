import { Component, computed, inject, input, signal } from '@angular/core';
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
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { safeReturnUrl } from '../../application/return-url';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  Registration,
} from '../../domain/me';

/** Creates an account on `/sign-up`. The backend signs the new user in right away. */
@Component({
  selector: 'app-sign-up',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    TranslatePipe,
    FailureAlert,
    FormText,
    UiButton,
    UiText,
  ],
  styleUrl: './sign-up.scss',
  templateUrl: './sign-up.html',
})
export class SignUp {
  /** Query parameter, bound through `withComponentInputBinding()`. Set by `authGuard`. */
  readonly returnUrl = input<string>();

  private readonly _store = inject(AuthStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _passwordMinLength = PASSWORD_MIN_LENGTH;
  private readonly _submitting = computed(
    () => this._store.mutationState().loadingState === 'loading',
  );
  private readonly _emailTaken = computed(
    () => this._store.mutationState().failure?.kind === 'conflict',
  );

  private readonly _registration = signal<Registration>({ name: '', email: '', password: '' });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _signUpForm = form(
    this._registration,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: () =>
          this._i18n.translate('signUp.validation.nameTooLong', { max: NAME_MAX_LENGTH }),
      });
      required(path.email, {
        message: () => this._i18n.translate('signUp.validation.emailRequired'),
      });
      email(path.email, {
        message: () => this._i18n.translate('signUp.validation.emailInvalid'),
      });
      required(path.password, {
        message: () => this._i18n.translate('signUp.validation.passwordRequired'),
      });
      minLength(path.password, PASSWORD_MIN_LENGTH, {
        message: () =>
          this._i18n.translate('signUp.validation.passwordTooShort', { min: PASSWORD_MIN_LENGTH }),
      });
      maxLength(path.password, PASSWORD_MAX_LENGTH, {
        message: () =>
          this._i18n.translate('signUp.validation.passwordTooLong', { max: PASSWORD_MAX_LENGTH }),
      });
    },
    { submission: { action: () => this._signUp() } },
  );

  constructor() {
    // The store outlives the page, so a failure of an earlier attempt would still be shown.
    this._store.resetMutation();
  }

  private async _signUp(): Promise<void> {
    if (await this._store.signUp(this._registration())) {
      this._toast.success(this._i18n.translate('signUp.signedUp'));
      await this._router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    }
  }
}
