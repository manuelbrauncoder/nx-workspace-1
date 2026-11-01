import { inject, Service } from '@angular/core';
import { LegalRepository } from '@api/legal/legal.repository';
import { Localized } from '@core/i18n/localized';
import { Observable } from 'rxjs';
import { LegalPage, LegalPageName, LegalPages } from './legal';

/** What the editor can do with the backend: read every legal page and replace one of them. */
@Service({ autoProvided: false })
export class LegalEditorUseCase {
  private readonly _repository = inject(LegalRepository);

  getAll(): Observable<LegalPages> {
    return this._repository.getAll();
  }

  update(name: LegalPageName, html: Localized<string>): Observable<LegalPage> {
    return this._repository.update(name, html);
  }
}
