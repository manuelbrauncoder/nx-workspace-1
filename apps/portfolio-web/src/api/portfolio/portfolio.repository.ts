import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Portfolio, PortfolioSectionName, PortfolioSections } from './portfolio';
import { PortfolioDtoMapper } from './portfolio-dto.mapper';
import { PortfolioDto, PortfolioSectionResponseDto } from './portfolio.dto';

/** Talks to the portfolio endpoints and hands out models, never DTOs. */
@Service()
export class PortfolioRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(PortfolioDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/portfolio`;
  }

  /** The content of the start page in every language. Public. */
  get(): Observable<Portfolio> {
    return this._http.get<PortfolioDto>(this._url).pipe(map((dto) => this._mapper.toModel(dto)));
  }

  /** Admin only. Answers with 409 if the section already exists. */
  create<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
  ): Observable<PortfolioSections[K]> {
    return this._http
      .post<PortfolioSectionResponseDto<K>>(
        `${this._url}/${name}`,
        this._mapper.toSectionDto(name, value, 'create'),
      )
      .pipe(map((response) => this._mapper.toSectionModel(name, response[name])));
  }

  /** Admin only. Replaces every field of the section, an unset optional field is removed. */
  update<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
  ): Observable<PortfolioSections[K]> {
    return this._http
      .patch<PortfolioSectionResponseDto<K>>(
        `${this._url}/${name}`,
        this._mapper.toSectionDto(name, value, 'update'),
      )
      .pipe(map((response) => this._mapper.toSectionModel(name, response[name])));
  }
}
