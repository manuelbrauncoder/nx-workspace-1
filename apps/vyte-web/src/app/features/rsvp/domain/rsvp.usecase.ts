import { inject, Service } from '@angular/core';
import { RsvpRepository } from '@api/rsvp/rsvp.repository';
import { Observable } from 'rxjs';
import { Invitation, RsvpAnswer } from './invitation';

/**
 * What the personal page of a guest can do. For now it only passes the repository through. It is
 * the place to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class RsvpUseCase {
  private readonly _repository = inject(RsvpRepository);

  getByToken(token: string): Observable<Invitation> {
    return this._repository.getByToken(token);
  }

  /** Resolves with the invitation including the saved answer. */
  answer(token: string, answer: RsvpAnswer): Observable<Invitation> {
    return this._repository.answer(token, answer);
  }

  imageUrl(token: string, imageId: string): string {
    return this._repository.imageUrl(token, imageId);
  }

  calendarUrl(token: string): string {
    return this._repository.calendarUrl(token);
  }
}
