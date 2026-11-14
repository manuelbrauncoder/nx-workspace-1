import { inject, Service } from '@angular/core';
import { LegalRepository } from '@api/legal/legal.repository';
import { AppLanguage } from '@core/i18n/languages';
import { Observable } from 'rxjs';
import { LegalPageName } from './legal';

/** What the legal pages read from the backend: the finished HTML of a page in one language. */
@Service({ autoProvided: false })
export class LegalUseCase {
  private readonly _repository = inject(LegalRepository);

  getHtml(name: LegalPageName, language: AppLanguage): Observable<string> {
    return this._repository.getHtml(name, language);
  }
}
