import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Member } from './member';
import { HandOverDto, MemberDto } from './member.dto';

@Service()
export class MemberDtoMapper extends DtoMapper<MemberDto, Member> {
  toModel(dto: MemberDto): Member {
    return {
      userId: dto.userId,
      name: dto.name,
      email: dto.email,
      role: dto.role,
      joinedAt: new Date(dto.joinedAt),
    };
  }

  toDto(member: Member): MemberDto {
    return {
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  toHandOverDto(userId: string): HandOverDto {
    return { userId };
  }
}
