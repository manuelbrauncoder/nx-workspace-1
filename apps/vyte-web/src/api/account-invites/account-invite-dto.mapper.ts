import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { AccountInvite } from './account-invite';
import { AccountInviteDto, CreateAccountInviteDto } from './account-invite.dto';

@Service()
export class AccountInviteDtoMapper extends DtoMapper<AccountInviteDto, AccountInvite> {
  toModel(dto: AccountInviteDto): AccountInvite {
    return {
      id: dto.id,
      name: dto.name,
      token: dto.token,
      expiresAt: new Date(dto.expiresAt),
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(invite: AccountInvite): AccountInviteDto {
    return {
      id: invite.id,
      name: invite.name,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  toCreateDto(name: string): CreateAccountInviteDto {
    return { name: name.trim() };
  }
}
