import { inject, Service } from '@angular/core';
import { ContactRepository } from '@api/contact/contact.repository';
import { UsersRepository } from '@api/users/users.repository';
import { Observable } from 'rxjs';
import { ReceivedMessage, User, UserRole } from './admin';

/**
 * What the admin area can do with the backend: manage the accounts and read the messages of the
 * contact form. Combines the users and the contact API.
 */
@Service({ autoProvided: false })
export class AdminUseCase {
  private readonly _users = inject(UsersRepository);
  private readonly _contact = inject(ContactRepository);

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

  getMessages(): Observable<ReceivedMessage[]> {
    return this._contact.getMessages();
  }

  setRead(id: string, read: boolean): Observable<ReceivedMessage> {
    return this._contact.setRead(id, read);
  }

  deleteMessage(id: string): Observable<void> {
    return this._contact.deleteMessage(id);
  }
}
