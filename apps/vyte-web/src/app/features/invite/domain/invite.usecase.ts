import { inject, Service } from '@angular/core';
import { InvitesRepository } from '@api/invites/invites.repository';
import { Observable } from 'rxjs';
import { InvitePreview, Registration, VyteEvent } from './invite';

/**
 * What the page of an editor invite can do. For now it only passes the repository through. It is
 * the place to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class InviteUseCase {
  private readonly _repository = inject(InvitesRepository);

  getByToken(token: string): Observable<InvitePreview> {
    return this._repository.getByToken(token);
  }

  /** Resolves with the event the signed-in user now plans. */
  accept(token: string): Observable<VyteEvent> {
    return this._repository.accept(token);
  }

  /** Creates the account, signs it in and makes it an editor. Resolves with the event. */
  signUp(token: string, registration: Registration): Observable<VyteEvent> {
    return this._repository.signUp(token, registration);
  }
}
