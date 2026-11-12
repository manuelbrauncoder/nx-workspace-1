import { inject, Service } from '@angular/core';
import { AccountInvitesRepository } from '@api/account-invites/account-invites.repository';
import { AuthRepository } from '@api/auth/auth.repository';
import { Observable } from 'rxjs';
import { AccountInvitePreview, Credentials, Me, Registration } from './me';

/**
 * What the auth feature can do with its data: the session, and an account from an account link,
 * which signs in as well. Unlike the use case of other features it is provided app-wide, as
 * `AuthStore` is.
 */
@Service()
export class AuthUseCase {
  private readonly _repository = inject(AuthRepository);
  private readonly _accountInvites = inject(AccountInvitesRepository);

  /** The signed-in user, or `undefined` when nobody is signed in. */
  getMe(): Observable<Me | undefined> {
    return this._repository.getMe();
  }

  signIn(credentials: Credentials): Observable<Me> {
    return this._repository.signIn(credentials);
  }

  signOut(): Observable<void> {
    return this._repository.signOut();
  }

  /** What the page of an account link shows. An unknown, used or expired link is a 404. */
  getAccountInvite(token: string): Observable<AccountInvitePreview> {
    return this._accountInvites.getByToken(token);
  }

  /** Creates the account of a link and signs it in. */
  acceptAccountInvite(token: string, registration: Registration): Observable<Me> {
    return this._accountInvites.accept(token, registration);
  }
}
