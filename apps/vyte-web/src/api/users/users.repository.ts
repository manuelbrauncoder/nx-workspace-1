import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { User, UserRole } from './user';
import { UserDtoMapper } from './user-dto.mapper';
import { UserResponseDto, UsersResponseDto } from './user.dto';

/**
 * Talks to the user endpoints of the admin API and hands out models, never DTOs. Every request
 * answers 403 to non-admins. An admin cannot change or delete their own account (409).
 */
@Service()
export class UsersRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(UserDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/admin/users`;
  }

  /** Every account, oldest first. */
  getAll(): Observable<User[]> {
    return this._http
      .get<UsersResponseDto>(this._url)
      .pipe(map((response) => this._mapper.toModels(response.users)));
  }

  /** Grants or removes admin rights. Takes effect on the next request of that user. */
  setRole(id: string, role: UserRole): Observable<User> {
    return this._http
      .patch<UserResponseDto>(this._urlFor(id), this._mapper.toRoleDto(role))
      .pipe(map((response) => this._mapper.toModel(response.user)));
  }

  /** Deletes the account together with its sessions and everything it owns. */
  delete(id: string): Observable<void> {
    return this._http.delete<void>(this._urlFor(id));
  }

  /** Signs the user out on every device. They can sign in again. */
  revokeSessions(id: string): Observable<void> {
    return this._http.delete<void>(`${this._urlFor(id)}/sessions`);
  }

  private _urlFor(id: string): string {
    return `${this._url}/${encodeURIComponent(id)}`;
  }
}
