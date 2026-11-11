import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { EditorInvite } from './member';
import { EditorInviteDto } from './member.dto';

@Service()
export class EditorInviteDtoMapper extends DtoMapper<EditorInviteDto, EditorInvite> {
  toModel(dto: EditorInviteDto): EditorInvite {
    return {
      id: dto.id,
      token: dto.token,
      expiresAt: new Date(dto.expiresAt),
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(invite: EditorInvite): EditorInviteDto {
    return {
      id: invite.id,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }
}
