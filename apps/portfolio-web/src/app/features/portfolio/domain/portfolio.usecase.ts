import { inject, Service } from '@angular/core';
import { PortfolioRepository } from '@api/portfolio/portfolio.repository';
import { Observable } from 'rxjs';
import { Portfolio } from './portfolio';

/** What the start page reads from the backend: its content in every language. */
@Service({ autoProvided: false })
export class PortfolioUseCase {
  private readonly _repository = inject(PortfolioRepository);

  get(): Observable<Portfolio> {
    return this._repository.get();
  }
}
