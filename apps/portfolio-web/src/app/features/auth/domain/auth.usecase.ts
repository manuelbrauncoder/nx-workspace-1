import { inject, Service } from '@angular/core';
import { AuthRepository } from '@api/auth/auth.repository';
import { Observable } from 'rxjs';
import { Credentials, Me, Registration } from './me';

/**
 * What the auth feature can do with its data. For now it only passes the repository through.
 * Unlike the use case of other features it is provided app-wide, as `AuthStore` is.
 */
@Service()
export class AuthUseCase {
  private readonly _repository = inject(AuthRepository);

  /** The signed-in user, or `undefined` when nobody is signed in. */
  getMe(): Observable<Me | undefined> {
    return this._repository.getMe();
  }

  signIn(credentials: Credentials): Observable<Me> {
    return this._repository.signIn(credentials);
  }

  signUp(registration: Registration): Observable<Me> {
    return this._repository.signUp(registration);
  }

  signOut(): Observable<void> {
    return this._repository.signOut();
  }
}
