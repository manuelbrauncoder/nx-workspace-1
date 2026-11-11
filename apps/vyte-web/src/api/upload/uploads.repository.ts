import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Upload, UploadLink } from './upload';
import { UploadDtoMapper } from './upload-dto.mapper';
import { UploadResponseDto } from './upload.dto';

/**
 * Talks to the two upload pages of an event: the personal one of a guest and the shared one of
 * the photo stand. Public, the token in the address is all a visitor needs. An unknown or
 * renewed token is a 404, an upload outside the window or past the limit a 409. Hands out
 * models, never DTOs.
 */
@Service()
export class UploadsRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(UploadDtoMapper);

  get(link: UploadLink): Observable<Upload> {
    return this._http
      .get<UploadResponseDto>(this._url(link))
      .pipe(map((response) => this._mapper.toModel(response.upload)));
  }

  /**
   * Gives this browser an id for the photo stand, as an HTTP-only cookie. Needed once before
   * the first upload there, a browser that already has one keeps it.
   */
  registerDevice(token: string): Observable<void> {
    return this._http.post<void>(`${this._url({ kind: 'stand', token })}/device`, null);
  }

  /**
   * Uploads one photo. One file per request, so a page can show progress per photo and one
   * failure does not lose the others. `name` is who took it, asked for at the stand only.
   */
  upload(link: UploadLink, file: File, name = ''): Observable<Upload> {
    const body = new FormData();
    body.append('photo', file, file.name);
    const uploaderName = name.trim();
    if (link.kind === 'stand' && uploaderName) {
      body.append('name', uploaderName);
    }
    return this._http
      .post<UploadResponseDto>(this._url(link), body)
      .pipe(map((response) => this._mapper.toModel(response.upload)));
  }

  /** Takes back one of the visitor's own photos. Resolves with what is left. */
  deletePhoto(link: UploadLink, photoId: string): Observable<Upload> {
    return this._http
      .delete<UploadResponseDto>(this.photoUrl(link, photoId))
      .pipe(map((response) => this._mapper.toModel(response.upload)));
  }

  /** Address of one of the visitor's own photos, for an `<img>`. */
  photoUrl(link: UploadLink, photoId: string): string {
    return `${this._url(link)}/${encodeURIComponent(photoId)}`;
  }

  private _url(link: UploadLink): string {
    const path = link.kind === 'guest' ? 'photos' : 'stand';
    return `${this._config.apiBaseUrl}/${path}/${encodeURIComponent(link.token)}`;
  }
}
