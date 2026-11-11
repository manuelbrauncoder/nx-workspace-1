import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Photo } from './photo';
import { PhotoDtoMapper } from './photo-dto.mapper';
import { PhotoResponseDto, PhotosResponseDto } from './photo.dto';

/**
 * Talks to the photos of an event as its hosts see them. For members of the event only. What
 * guests upload goes through `UploadsRepository`. Hands out models, never DTOs.
 */
@Service()
export class PhotosRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(PhotoDtoMapper);

  /** Every photo of the event, hidden ones too, newest first. */
  getAll(eventId: string): Observable<Photo[]> {
    return this._http
      .get<PhotosResponseDto>(this._url(eventId))
      .pipe(map((response) => this._mapper.toModels(response.photos)));
  }

  /** Hides a photo or shows it again. */
  setHidden(eventId: string, photoId: string, hidden: boolean): Observable<Photo> {
    return this._http
      .patch<PhotoResponseDto>(this.photoUrl(eventId, photoId), this._mapper.toHideDto(hidden))
      .pipe(map((response) => this._mapper.toModel(response.photo)));
  }

  delete(eventId: string, photoId: string): Observable<void> {
    return this._http.delete<void>(this.photoUrl(eventId, photoId));
  }

  /** Address of the file. It needs the session cookie, an `<img>` sends it. */
  photoUrl(eventId: string, photoId: string): string {
    return `${this._url(eventId)}/${encodeURIComponent(photoId)}`;
  }

  /**
   * Address of every photo that is not hidden as one ZIP file. Meant for a link: the browser
   * sends the session cookie and saves the file.
   */
  archiveUrl(eventId: string): string {
    return `${this._url(eventId)}/archive`;
  }

  private _url(eventId: string): string {
    return `${this._config.apiBaseUrl}/events/${encodeURIComponent(eventId)}/photos`;
  }
}
