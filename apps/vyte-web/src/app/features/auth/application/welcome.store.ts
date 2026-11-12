import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { AuthUseCase } from '../domain/auth.usecase';

/**
 * The account link of `/welcome/:token`: whom it is for. Provided on that route only, creating
 * the account goes through `AuthStore`, which then knows who is signed in.
 */
@Service({ autoProvided: false })
export class WelcomeStore {
  private readonly _useCase = inject(AuthUseCase);

  private readonly _token = signal<string | undefined>(undefined);
  private readonly _invite = rxResource({
    params: () => this._token(),
    stream: ({ params: token }) => this._useCase.getAccountInvite(token),
  });

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly invite = computed(() => (this._invite.hasValue() ? this._invite.value() : undefined));
  readonly inviteState = asyncState(this._invite);

  select(token: string): void {
    this._token.set(token);
  }

  reload(): void {
    this._invite.reload();
  }
}
