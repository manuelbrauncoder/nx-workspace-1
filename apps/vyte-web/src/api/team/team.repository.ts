import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { EditorInviteDtoMapper } from './editor-invite-dto.mapper';
import { EditorInvite, Member } from './member';
import { MemberDtoMapper } from './member-dto.mapper';
import {
  EditorInviteResponseDto,
  EditorInvitesResponseDto,
  MembersResponseDto,
} from './member.dto';

/**
 * Talks to the team of an event: its members and the open invites for editors. Hands out
 * models, never DTOs. Invites and the handover are for the owner only (403 for an editor).
 */
@Service()
export class TeamRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(MemberDtoMapper);
  private readonly _inviteMapper = inject(EditorInviteDtoMapper);

  /** The owner first, then the editors in the order they joined. */
  getMembers(eventId: string): Observable<Member[]> {
    return this._http
      .get<MembersResponseDto>(`${this._url(eventId)}/members`)
      .pipe(map((response) => this._mapper.toModels(response.members)));
  }

  /** The owner removes an editor, or an editor leaves by removing themself. */
  removeMember(eventId: string, userId: string): Observable<void> {
    return this._http.delete<void>(`${this._url(eventId)}/members/${encodeURIComponent(userId)}`);
  }

  /** Makes an editor the owner, the former owner becomes an editor. Resolves with the team. */
  handOver(eventId: string, userId: string): Observable<Member[]> {
    return this._http
      .put<MembersResponseDto>(`${this._url(eventId)}/owner`, this._mapper.toHandOverDto(userId))
      .pipe(map((response) => this._mapper.toModels(response.members)));
  }

  /** The open invites, used and expired ones are gone. */
  getInvites(eventId: string): Observable<EditorInvite[]> {
    return this._http
      .get<EditorInvitesResponseDto>(`${this._url(eventId)}/invites`)
      .pipe(map((response) => this._inviteMapper.toModels(response.invites)));
  }

  /** The link is valid for 7 days. A 409 once the team is full. */
  createInvite(eventId: string): Observable<EditorInvite> {
    return this._http
      .post<EditorInviteResponseDto>(`${this._url(eventId)}/invites`, null)
      .pipe(map((response) => this._inviteMapper.toModel(response.invite)));
  }

  deleteInvite(eventId: string, inviteId: string): Observable<void> {
    return this._http.delete<void>(`${this._url(eventId)}/invites/${encodeURIComponent(inviteId)}`);
  }

  private _url(eventId: string): string {
    return `${this._config.apiBaseUrl}/events/${encodeURIComponent(eventId)}`;
  }
}
