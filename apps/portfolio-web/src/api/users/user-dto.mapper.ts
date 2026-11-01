import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { User, UserRole } from './user';
import { UserDto, UserRoleDto } from './user.dto';

@Service()
export class UserDtoMapper extends DtoMapper<UserDto, User> {
  toModel(dto: UserDto): User {
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name ?? undefined,
      role: dto.role,
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  toRoleDto(role: UserRole): UserRoleDto {
    return { role };
  }
}
