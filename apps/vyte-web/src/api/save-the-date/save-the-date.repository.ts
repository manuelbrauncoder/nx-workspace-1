import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { PreviewImage, previewImage } from '../preview-image';
import { SaveTheDate } from './save-the-date';
import { SaveTheDateDtoMapper } from './save-the-date-dto.mapper';
import { SaveTheDateResponseDto } from './save-the-date.dto';

/**
 * Talks to the save-the-date page of an event. Public, the token in the address is all a
 * visitor needs. A page that is off or whose link was renewed is a 404. Turning it on and off
 * is in `EventsRepository`. Hands out models, never DTOs.
 */
@Service()
export class SaveTheDateRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(SaveTheDateDtoMapper);

  getByToken(token: string): Observable<SaveTheDate> {
    return this._http
      .get<SaveTheDateResponseDto>(this._url(token))
      .pipe(map((response) => this._mapper.toModel(response.saveTheDate)));
  }

  /** Address of the cover, for an `<img>`. Only there while `cover` is set. */
  coverUrl(token: string): string {
    return `${this._url(token)}/cover`;
  }

  /** Preview image of the shared link, cut from the cover. Only there while the event has one. */
  previewImage(token: string): PreviewImage {
    return previewImage(`${this._url(token)}/preview`);
  }

  /** Address of the event as a calendar file (`.ics`), for a link. */
  calendarUrl(token: string): string {
    return `${this._url(token)}/calendar`;
  }

  private _url(token: string): string {
    return `${this._config.apiBaseUrl}/save-the-date/${encodeURIComponent(token)}`;
  }
}
