import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Guest, GuestDraft, GuestsBulk, GuestsExportLanguage, HostAnswer } from './guest';
import { GuestDtoMapper } from './guest-dto.mapper';
import { GuestResponseDto, GuestsResponseDto } from './guest.dto';

/**
 * Talks to the guest list of an event and hands out models, never DTOs. For members of the
 * event only. A past event refuses changes with a 409.
 */
@Service()
export class GuestsRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(GuestDtoMapper);

  /** The guests of an event, sorted by name. */
  getAll(eventId: string): Observable<Guest[]> {
    return this._http
      .get<GuestsResponseDto>(this._url(eventId))
      .pipe(map((response) => this._mapper.toModels(response.guests)));
  }

  create(eventId: string, draft: GuestDraft): Observable<Guest> {
    return this._http
      .post<GuestResponseDto>(this._url(eventId), this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.guest)));
  }

  /** All or nothing: if one name is invalid or the list would get too long, nobody is added. */
  createBulk(eventId: string, bulk: GuestsBulk): Observable<Guest[]> {
    return this._http
      .post<GuestsResponseDto>(`${this._url(eventId)}/bulk`, this._mapper.toBulkDto(bulk))
      .pipe(map((response) => this._mapper.toModels(response.guests)));
  }

  update(eventId: string, guestId: string, draft: GuestDraft): Observable<Guest> {
    return this._http
      .patch<GuestResponseDto>(this._urlFor(eventId, guestId), this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.guest)));
  }

  /** Records an answer for a guest, e.g. one given in person. */
  setResponse(eventId: string, guestId: string, answer: HostAnswer): Observable<Guest> {
    return this._http
      .put<GuestResponseDto>(
        `${this._urlFor(eventId, guestId)}/response`,
        this._mapper.toHostAnswerDto(answer),
      )
      .pipe(map((response) => this._mapper.toModel(response.guest)));
  }

  delete(eventId: string, guestId: string): Observable<void> {
    return this._http.delete<void>(this._urlFor(eventId, guestId));
  }

  /** Gives the guest a new personal link, the old one stops working. */
  renewToken(eventId: string, guestId: string): Observable<Guest> {
    return this._http
      .post<GuestResponseDto>(`${this._urlFor(eventId, guestId)}/token`, null)
      .pipe(map((response) => this._mapper.toModel(response.guest)));
  }

  /** Gives the guest a new upload link, the printed place card stops working. */
  renewPhotoToken(eventId: string, guestId: string): Observable<Guest> {
    return this._http
      .post<GuestResponseDto>(`${this._urlFor(eventId, guestId)}/photo-token`, null)
      .pipe(map((response) => this._mapper.toModel(response.guest)));
  }

  /**
   * Address of the guest list as a CSV file. Meant for a link: the browser sends the session
   * cookie and saves the file under the name the backend gives it.
   */
  exportUrl(eventId: string, language: GuestsExportLanguage): string {
    return `${this._url(eventId)}/export?lang=${language}`;
  }

  private _url(eventId: string): string {
    return `${this._config.apiBaseUrl}/events/${encodeURIComponent(eventId)}/guests`;
  }

  private _urlFor(eventId: string, guestId: string): string {
    return `${this._url(eventId)}/${encodeURIComponent(guestId)}`;
  }
}
