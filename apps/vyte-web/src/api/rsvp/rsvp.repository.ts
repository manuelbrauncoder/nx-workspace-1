import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Invitation, RsvpAnswer } from './invitation';
import { InvitationDtoMapper } from './invitation-dto.mapper';
import { InvitationResponseDto } from './invitation.dto';

/**
 * Talks to the personal page of a guest. Public: the token in the address is all a guest needs,
 * there is no account and no cookie. An unknown or renewed token is a 404. Hands out models,
 * never DTOs.
 */
@Service()
export class RsvpRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(InvitationDtoMapper);

  getByToken(token: string): Observable<Invitation> {
    return this._http
      .get<InvitationResponseDto>(this._url(token))
      .pipe(map((response) => this._mapper.toModel(response.invitation)));
  }

  /** Saves the answer, a guest can change it until the deadline. A 409 once answers are closed. */
  answer(token: string, answer: RsvpAnswer): Observable<Invitation> {
    return this._http
      .put<InvitationResponseDto>(this._url(token), this._mapper.toAnswerDto(answer))
      .pipe(map((response) => this._mapper.toModel(response.invitation)));
  }

  /** Address of an image of the event, for an `<img>`. */
  imageUrl(token: string, imageId: string): string {
    return `${this._url(token)}/images/${encodeURIComponent(imageId)}`;
  }

  /** Address of the event as a calendar file (`.ics`), for a link. */
  calendarUrl(token: string): string {
    return `${this._url(token)}/calendar`;
  }

  private _url(token: string): string {
    return `${this._config.apiBaseUrl}/rsvp/${encodeURIComponent(token)}`;
  }
}
