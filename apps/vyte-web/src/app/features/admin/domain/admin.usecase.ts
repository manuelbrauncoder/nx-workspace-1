import { inject, Service } from '@angular/core';
import { AccountInvitesRepository } from '@api/account-invites/account-invites.repository';
import { UsersRepository } from '@api/users/users.repository';
import { Observable } from 'rxjs';
import { AccountInvite, User, UserRole } from './admin';

/**
 * What the admin area can do with the backend: manage the accounts and the account links that
 * create new ones. Sign-up is closed, so the links are the way in. Combines two API layers.
 */
@Service({ autoProvided: false })
export class AdminUseCase {
  private readonly _users = inject(UsersRepository);
  private readonly _accountInvites = inject(AccountInvitesRepository);

  getUsers(): Observable<User[]> {
    return this._users.getAll();
  }

  setRole(id: string, role: UserRole): Observable<User> {
    return this._users.setRole(id, role);
  }

  deleteUser(id: string): Observable<void> {
    return this._users.delete(id);
  }

  revokeSessions(id: string): Observable<void> {
    return this._users.revokeSessions(id);
  }

  getAccountInvites(): Observable<AccountInvite[]> {
    return this._accountInvites.getAll();
  }

  createAccountInvite(name: string): Observable<AccountInvite> {
    return this._accountInvites.create(name);
  }

  deleteAccountInvite(id: string): Observable<void> {
    return this._accountInvites.delete(id);
  }
}
