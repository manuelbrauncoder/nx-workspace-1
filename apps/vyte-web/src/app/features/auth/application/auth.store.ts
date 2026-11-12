import { computed, inject, Service, signal } from '@angular/core';
import { AppLog } from '@core/log/app-log';
import { mutation } from '@core/state/mutation';
import { map } from 'rxjs';
import { AuthUseCase } from '../domain/auth.usecase';
import { Credentials, Me, Registration } from '../domain/me';

/**
 * Who is signed in. Unlike the store of other features it is provided app-wide and not in the
 * feature routes, because the header and the guards of other features need it on every page.
 * They reach it through `public-api.ts`.
 */
@Service()
export class AuthStore {
  private readonly _useCase = inject(AuthUseCase);
  private readonly _log = inject(AppLog);

  private readonly _me = signal<Me | undefined>(undefined);

  private readonly _getMeMutation = mutation();
  private readonly _mutation = mutation();
  // Runs from the header, so it must not share its state with the forms.
  private readonly _signOutMutation = mutation();

  readonly me = this._me.asReadonly();
  readonly isSignedIn = computed(() => this._me() !== undefined);
  readonly isAdmin = computed(() => this._me()?.role === 'admin');

  /** State of the most recent sign-in or account creation. */
  readonly mutationState = this._mutation.state;
  readonly signOutState = this._signOutMutation.state;

  /**
   * Asks the backend who is signed in. Runs once before the first render, see `provideAuth()`.
   * A backend that cannot be reached must not keep the app from starting, so a failure leaves
   * the user signed out.
   */
  async getMe(): Promise<void> {
    this._setMe(await this._getMeMutation.run(this._useCase.getMe()));
    const failure = this._getMeMutation.state().failure;
    if (failure) {
      this._log.warn('Could not load the session, continuing signed out.', failure);
    }
  }

  async signIn(credentials: Credentials): Promise<Me | undefined> {
    const me = await this._mutation.run(this._useCase.signIn(credentials));
    if (me) {
      this._setMe(me);
    }
    return me;
  }

  /** Creates the account of an account link and signs it in. Shares the state of sign-in. */
  async acceptAccountInvite(token: string, registration: Registration): Promise<Me | undefined> {
    const me = await this._mutation.run(this._useCase.acceptAccountInvite(token, registration));
    if (me) {
      this._setMe(me);
    }
    return me;
  }

  async signOut(): Promise<boolean> {
    const done = await this._signOutMutation.run(this._useCase.signOut().pipe(map(() => true)));
    if (done) {
      this._setMe(undefined);
    }
    return done ?? false;
  }

  /** Forgets the user without a request, e.g. after the backend ended the session. */
  clearMe(): void {
    this._setMe(undefined);
  }

  /** Drops the failure of an earlier sign-in or account creation. */
  resetMutation(): void {
    this._mutation.reset();
  }

  private _setMe(me: Me | undefined): void {
    this._me.set(me);
  }
}
