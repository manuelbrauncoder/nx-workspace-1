import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Media } from './media';
import { MediaDtoMapper } from './media-dto.mapper';
import { MediaListResponseDto, MediaResponseDto } from './media.dto';

/** Talks to the media endpoints, admin only. Hands out models, never DTOs. */
@Service()
export class MediaRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(MediaDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/media`;
  }

  /** Every uploaded image, newest first. */
  getAll(): Observable<Media[]> {
    return this._http
      .get<MediaListResponseDto>(this._url)
      .pipe(map((response) => this._mapper.toModels(response.media)));
  }

  /** Uploads one image. The backend converts it to WebP and answers with the new record. */
  upload(file: File): Observable<Media> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this._http
      .post<MediaResponseDto>(this._url, body)
      .pipe(map((response) => this._mapper.toModel(response.media)));
  }
}
