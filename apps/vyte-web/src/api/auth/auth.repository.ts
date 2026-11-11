import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { toFailure } from '@core/failure/to-failure';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Credentials, Me } from './me';
import { MeDtoMapper } from './me-dto.mapper';
import { MeResponseDto } from './me.dto';

/**
 * Talks to the auth endpoints. The session itself is an HTTP-only cookie the backend sets, so
 * nothing here stores a token. There is no sign-up: an account comes from an account link
 * (`AccountInvitesRepository`) or from the invite of an event (`InvitesRepository`).
 */
@Service()
export class AuthRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(MeDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/auth`;
  }

  /** The signed-in user, or `undefined` when nobody is signed in. */
  getMe(): Observable<Me | undefined> {
    return this._http.get<MeResponseDto>(`${this._url}/me`).pipe(
      map((response) => this._mapper.toModel(response.user)),
      catchError((error: unknown) =>
        toFailure(error).kind === 'unauthorized' ? of(undefined) : throwError(() => error),
      ),
    );
  }

  signIn(credentials: Credentials): Observable<Me> {
    return this._http
      .post<MeResponseDto>(`${this._url}/sign-in`, this._mapper.toSignInDto(credentials))
      .pipe(map((response) => this._mapper.toModel(response.user)));
  }

  signOut(): Observable<void> {
    return this._http.post<void>(`${this._url}/sign-out`, null);
  }
}
