import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Me, Registration } from '../auth/me';
import { MeDtoMapper } from '../auth/me-dto.mapper';
import { MeResponseDto } from '../auth/me.dto';
import { AccountInvite, AccountInvitePreview } from './account-invite';
import { AccountInviteDtoMapper } from './account-invite-dto.mapper';
import {
  AccountInvitePreviewResponseDto,
  AccountInviteResponseDto,
  AccountInvitesResponseDto,
} from './account-invite.dto';

/**
 * Talks to the account links: an admin creates them, the invited person turns one into an
 * account. Sign-up is closed, so this is how a host gets an account. Hands out models, never DTOs.
 */
@Service()
export class AccountInvitesRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(AccountInviteDtoMapper);
  private readonly _meMapper = inject(MeDtoMapper);

  private get _adminUrl(): string {
    return `${this._config.apiBaseUrl}/admin/account-invites`;
  }

  /** Admin only. The open links, used and expired ones are gone. */
  getAll(): Observable<AccountInvite[]> {
    return this._http
      .get<AccountInvitesResponseDto>(this._adminUrl)
      .pipe(map((response) => this._mapper.toModels(response.invites)));
  }

  /** Admin only. The link is valid for 7 days. */
  create(name: string): Observable<AccountInvite> {
    return this._http
      .post<AccountInviteResponseDto>(this._adminUrl, this._mapper.toCreateDto(name))
      .pipe(map((response) => this._mapper.toModel(response.invite)));
  }

  /** Admin only. */
  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${this._adminUrl}/${encodeURIComponent(id)}`);
  }

  /** Public. An unknown, used or expired link is a 404. */
  getByToken(token: string): Observable<AccountInvitePreview> {
    return this._http
      .get<AccountInvitePreviewResponseDto>(this._publicUrl(token))
      .pipe(map((response) => ({ name: response.invite.name })));
  }

  /** Public. Creates the account, signs it in and uses the link up. */
  accept(token: string, registration: Registration): Observable<Me> {
    return this._http
      .post<MeResponseDto>(this._publicUrl(token), this._meMapper.toSignUpDto(registration))
      .pipe(map((response) => this._meMapper.toModel(response.user)));
  }

  private _publicUrl(token: string): string {
    return `${this._config.apiBaseUrl}/auth/account-invites/${encodeURIComponent(token)}`;
  }
}
