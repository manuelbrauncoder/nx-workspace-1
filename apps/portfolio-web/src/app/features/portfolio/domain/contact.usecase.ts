import { inject, Service } from '@angular/core';
import { ContactRepository } from '@api/contact/contact.repository';
import { Observable } from 'rxjs';
import { ContactMessage } from './contact-message';

/** What the portfolio can do with the backend: hand over a message from the contact form. */
@Service({ autoProvided: false })
export class ContactUseCase {
  private readonly _repository = inject(ContactRepository);

  send(message: ContactMessage): Observable<void> {
    return this._repository.send(message);
  }
}
