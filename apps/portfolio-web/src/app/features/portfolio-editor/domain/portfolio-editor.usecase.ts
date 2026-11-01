import { inject, Service } from '@angular/core';
import { MediaRepository } from '@api/media/media.repository';
import { PortfolioRepository } from '@api/portfolio/portfolio.repository';
import { Observable } from 'rxjs';
import { Media, Portfolio, PortfolioSectionName, PortfolioSections } from './portfolio';

/**
 * What the editor can do with the backend: change the content of the start page section by
 * section and manage the images it points to. Combines the portfolio and the media API.
 */
@Service({ autoProvided: false })
export class PortfolioEditorUseCase {
  private readonly _portfolio = inject(PortfolioRepository);
  private readonly _media = inject(MediaRepository);

  get(): Observable<Portfolio> {
    return this._portfolio.get();
  }

  createSection<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
  ): Observable<PortfolioSections[K]> {
    return this._portfolio.create(name, value);
  }

  updateSection<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
  ): Observable<PortfolioSections[K]> {
    return this._portfolio.update(name, value);
  }

  getMedia(): Observable<Media[]> {
    return this._media.getAll();
  }

  upload(file: File): Observable<Media> {
    return this._media.upload(file);
  }
}
