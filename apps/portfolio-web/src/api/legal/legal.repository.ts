import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { AppLanguage } from '@core/i18n/languages';
import { Localized } from '@core/i18n/localized';
import { map, Observable } from 'rxjs';
import { LegalPage, LegalPageName, LegalPages } from './legal-page';
import { LegalPageDtoMapper } from './legal-page-dto.mapper';
import { LegalPageResponseDto, LegalPagesDto } from './legal-page.dto';

/** Talks to the legal endpoints and hands out models, never DTOs. */
@Service()
export class LegalRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(LegalPageDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/legal`;
  }

  /** The finished HTML of one page in one language. Public, the backend answers with HTML. */
  getHtml(name: LegalPageName, language: AppLanguage): Observable<string> {
    return this._http.get(`${this._url}/${name}`, {
      params: { lang: language },
      responseType: 'text',
    });
  }

  /** Admin only. Every page in every language. */
  getAll(): Observable<LegalPages> {
    return this._http.get<LegalPagesDto>(this._url).pipe(map((dto) => this._mapper.toPages(dto)));
  }

  /** Admin only. Replaces the HTML of both languages, a missing page is created. */
  update(name: LegalPageName, html: Localized<string>): Observable<LegalPage> {
    return this._http
      .patch<LegalPageResponseDto<typeof name>>(`${this._url}/${name}`, html)
      .pipe(map((response) => this._mapper.toModel(response[name])));
  }
}
