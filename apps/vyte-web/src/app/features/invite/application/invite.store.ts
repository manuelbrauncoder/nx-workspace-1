import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { AuthStore } from '@features/auth/public-api';
import { Registration, VyteEvent } from '../domain/invite';
import { InviteUseCase } from '../domain/invite.usecase';

/**
 * The editor invite of `/invite/:token`: to which event and from whom, and joining it. Provided
 * on that route only.
 */
@Service({ autoProvided: false })
export class InviteStore {
  private readonly _useCase = inject(InviteUseCase);
  private readonly _auth = inject(AuthStore);

  private readonly _token = signal<string | undefined>(undefined);
  private readonly _preview = rxResource({
    params: () => this._token(),
    stream: ({ params: token }) => this._useCase.getByToken(token),
  });
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly preview = computed(() => (this._preview.hasValue() ? this._preview.value() : undefined));
  readonly previewState = asyncState(this._preview);
  /** State of the most recent accept or sign-up. */
  readonly mutationState = this._mutation.state;

  select(token: string): void {
    this._token.set(token);
    this._mutation.reset();
  }

  reload(): void {
    this._preview.reload();
  }

  /** The signed-in user becomes an editor. A member just gets the event. */
  async accept(): Promise<VyteEvent | undefined> {
    const token = this._token();
    return token ? this._mutation.run(this._useCase.accept(token)) : undefined;
  }

  /**
   * Creates the account and joins the event. The answer is the event, so the signed-in user is
   * loaded afterwards: the header and the guards need to know them.
   */
  async signUp(registration: Registration): Promise<VyteEvent | undefined> {
    const token = this._token();
    if (!token) {
      return undefined;
    }
    const event = await this._mutation.run(this._useCase.signUp(token, registration));
    if (event) {
      await this._auth.getMe();
    }
    return event;
  }
}
