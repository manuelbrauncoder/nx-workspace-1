import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Credentials, Me, Registration } from './me';
import { MeDto, SignInDto, SignUpDto } from './me.dto';

@Service()
export class MeDtoMapper extends DtoMapper<MeDto, Me> {
  toModel(dto: MeDto): Me {
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name ?? undefined,
      role: dto.role,
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(me: Me): MeDto {
    return {
      id: me.id,
      email: me.email,
      name: me.name ?? null,
      role: me.role,
      createdAt: me.createdAt.toISOString(),
    };
  }

  /** The password is sent as typed, spaces can be part of it. */
  toSignInDto(credentials: Credentials): SignInDto {
    return { email: credentials.email.trim(), password: credentials.password };
  }

  toSignUpDto(registration: Registration): SignUpDto {
    const name = registration.name.trim();
    return {
      email: registration.email.trim(),
      password: registration.password,
      ...(name ? { name } : {}),
    };
  }
}
