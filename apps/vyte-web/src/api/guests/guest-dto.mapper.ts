import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Guest, GuestDraft, GuestsBulk, HostAnswer } from './guest';
import { CreateGuestDto, CreateGuestsBulkDto, GuestDto, HostAnswerDto } from './guest.dto';

@Service()
export class GuestDtoMapper extends DtoMapper<GuestDto, Guest> {
  toModel(dto: GuestDto): Guest {
    return {
      id: dto.id,
      name: dto.name,
      note: dto.note,
      maxCompanions: dto.maxCompanions,
      token: dto.token,
      photoToken: dto.photoToken,
      response: dto.response,
      companions: dto.companions,
      companionsReduced: dto.companionsReduced,
      message: dto.message,
      answeredBy: dto.answeredBy,
      respondedAt: dto.respondedAt ? new Date(dto.respondedAt) : null,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  }

  toDto(guest: Guest): GuestDto {
    return {
      id: guest.id,
      name: guest.name,
      note: guest.note,
      maxCompanions: guest.maxCompanions,
      token: guest.token,
      photoToken: guest.photoToken,
      response: guest.response,
      companions: guest.companions,
      companionsReduced: guest.companionsReduced,
      message: guest.message,
      answeredBy: guest.answeredBy,
      respondedAt: guest.respondedAt?.toISOString() ?? null,
      createdAt: guest.createdAt.toISOString(),
      updatedAt: guest.updatedAt.toISOString(),
    };
  }

  /** Adding and updating send every editable field. An empty note is sent as `null`. */
  toDraftDto(draft: GuestDraft): CreateGuestDto {
    return {
      name: draft.name.trim(),
      note: draft.note.trim() || null,
      maxCompanions: draft.maxCompanions,
    };
  }

  /** Names are sent trimmed, empty lines of a pasted list are left out. */
  toBulkDto(bulk: GuestsBulk): CreateGuestsBulkDto {
    return {
      names: bulk.names.map((name) => name.trim()).filter((name) => name !== ''),
      maxCompanions: bulk.maxCompanions,
    };
  }

  /** A decline brings nobody. */
  toHostAnswerDto(answer: HostAnswer): HostAnswerDto {
    return {
      response: answer.response,
      companions: answer.response === 'accepted' ? answer.companions : 0,
    };
  }
}
