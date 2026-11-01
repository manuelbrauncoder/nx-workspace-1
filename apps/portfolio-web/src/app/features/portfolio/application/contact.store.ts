import { inject, Service } from '@angular/core';
import { mutation } from '@core/state/mutation';
import { map } from 'rxjs';
import { ContactMessage } from '../domain/contact-message';
import { ContactUseCase } from '../domain/contact.usecase';

/** State of the contact form. Provided in the feature routes, so it lives as long as the page. */
@Service({ autoProvided: false })
export class ContactStore {
  private readonly _useCase = inject(ContactUseCase);
  private readonly _mutation = mutation();

  /** State of the most recent attempt to send a message. */
  readonly mutationState = this._mutation.state;

  /** Resolves with `true` once the backend took the message, `false` when sending failed. */
  async send(message: ContactMessage): Promise<boolean> {
    const sent = await this._mutation.run(this._useCase.send(message).pipe(map(() => true)));
    return sent ?? false;
  }

  /** Drops the failure of an earlier attempt, e.g. when the visitor edits the form again. */
  reset(): void {
    this._mutation.reset();
  }
}
