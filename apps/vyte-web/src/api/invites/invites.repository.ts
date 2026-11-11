import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Registration } from '../auth/me';
import { MeDtoMapper } from '../auth/me-dto.mapper';
import { VyteEvent } from '../events/event';
import { EventDtoMapper } from '../events/event-dto.mapper';
import { EventResponseDto } from '../events/event.dto';
import { InvitePreview } from './invite-preview';
import { InvitePreviewDtoMapper } from './invite-preview-dto.mapper';
import { InvitePreviewResponseDto } from './invite-preview.dto';

/**
 * Talks to the invite of an event as the invited person sees it. The owner's side of it is in
 * `TeamRepository`. An unknown, used or expired link is a 404. Hands out models, never DTOs.
 */
@Service()
export class InvitesRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(InvitePreviewDtoMapper);
  private readonly _eventMapper = inject(EventDtoMapper);
  private readonly _meMapper = inject(MeDtoMapper);

  /** Public. */
  getByToken(token: string): Observable<InvitePreview> {
    return this._http
      .get<InvitePreviewResponseDto>(this._url(token))
      .pipe(map((response) => this._mapper.toModel(response.invite)));
  }

  /** Makes the signed-in user an editor of the event and uses the link up. */
  accept(token: string): Observable<VyteEvent> {
    return this._http
      .post<EventResponseDto>(`${this._url(token)}/accept`, null)
      .pipe(map((response) => this._eventMapper.toModel(response.event)));
  }

  /**
   * Public. Creates an account, signs it in and makes it an editor of the event. The answer is
   * the event, who is signed in follows from `AuthRepository.getMe()`.
   */
  signUp(token: string, registration: Registration): Observable<VyteEvent> {
    return this._http
      .post<EventResponseDto>(
        `${this._url(token)}/sign-up`,
        this._meMapper.toSignUpDto(registration),
      )
      .pipe(map((response) => this._eventMapper.toModel(response.event)));
  }

  private _url(token: string): string {
    return `${this._config.apiBaseUrl}/invites/${encodeURIComponent(token)}`;
  }
}
