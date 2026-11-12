import { inject, Service } from '@angular/core';
import { SaveTheDateRepository } from '@api/save-the-date/save-the-date.repository';
import { Observable } from 'rxjs';
import { SaveTheDate } from './save-the-date';

/**
 * What the public save-the-date page can do. For now it only passes the repository through. It
 * is the place to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class SaveTheDateUseCase {
  private readonly _repository = inject(SaveTheDateRepository);

  getByToken(token: string): Observable<SaveTheDate> {
    return this._repository.getByToken(token);
  }

  coverUrl(token: string): string {
    return this._repository.coverUrl(token);
  }

  calendarUrl(token: string): string {
    return this._repository.calendarUrl(token);
  }
}
