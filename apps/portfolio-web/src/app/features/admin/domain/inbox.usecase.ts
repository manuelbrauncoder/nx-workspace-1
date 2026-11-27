import { inject, Service } from '@angular/core';
import { ContactRepository } from '@api/contact/contact.repository';
import { Observable } from 'rxjs';
import { ReceivedMessage } from './admin';

/**
 * The messages of the contact form. Provided app-wide, unlike `AdminUseCase`, because the bell in
 * the header needs them on every page.
 */
@Service()
export class InboxUseCase {
  private readonly _contact = inject(ContactRepository);

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
