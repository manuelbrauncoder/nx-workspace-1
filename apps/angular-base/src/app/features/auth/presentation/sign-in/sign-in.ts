import { Component, computed, inject, input, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
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
import { Credentials } from '../../domain/me';

/** Signs a user in on `/sign-in` and sends them on to the page they came for. */
@Component({
  selector: 'app-sign-in',
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
  styleUrl: './sign-in.scss',
  templateUrl: './sign-in.html',
})
export class SignIn {
  /** Query parameter, bound through `withComponentInputBinding()`. Set by `authGuard`. */
  readonly returnUrl = input<string>();

  private readonly _store = inject(AuthStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _submitting = computed(
    () => this._store.mutationState().loadingState === 'loading',
  );
  /** The backend answers a wrong email and a wrong password with the same 401. */
  private readonly _invalidCredentials = computed(
    () => this._store.mutationState().failure?.kind === 'unauthorized',
  );

  private readonly _credentials = signal<Credentials>({ email: '', password: '' });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _signInForm = form(
    this._credentials,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      required(path.email, {
        message: () => this._i18n.translate('signIn.validation.emailRequired'),
      });
      email(path.email, {
        message: () => this._i18n.translate('signIn.validation.emailInvalid'),
      });
      required(path.password, {
        message: () => this._i18n.translate('signIn.validation.passwordRequired'),
      });
    },
    { submission: { action: () => this._signIn() } },
  );

  constructor() {
    // The store outlives the page, so a failure of an earlier attempt would still be shown.
    this._store.resetMutation();
  }

  private async _signIn(): Promise<void> {
    if (await this._store.signIn(this._credentials())) {
      this._toast.success(this._i18n.translate('signIn.signedIn'));
      await this._router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    }
  }
}
