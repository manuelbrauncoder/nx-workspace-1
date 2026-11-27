import { inject, Service } from '@angular/core';
import { UsersRepository } from '@api/users/users.repository';
import { Observable } from 'rxjs';
import { User, UserRole } from './admin';

/** What the admin area can do with the accounts. The messages are in `InboxUseCase`. */
@Service({ autoProvided: false })
export class AdminUseCase {
  private readonly _users = inject(UsersRepository);

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
}
