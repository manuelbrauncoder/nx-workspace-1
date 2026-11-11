import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { SaveTheDate } from './save-the-date';
import { SaveTheDateDto } from './save-the-date.dto';

@Service()
export class SaveTheDateDtoMapper extends DtoMapper<SaveTheDateDto, SaveTheDate> {
  toModel(dto: SaveTheDateDto): SaveTheDate {
    if (dto.past) {
      return { past: true, title: dto.title };
    }
    return {
      past: false,
      title: dto.title,
      allDay: dto.allDay,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      timeZone: dto.timeZone,
      locationName: dto.locationName,
      note: dto.note,
      cover: dto.cover ? { ...dto.cover } : null,
    };
  }

  toDto(saveTheDate: SaveTheDate): SaveTheDateDto {
    if (saveTheDate.past) {
      return { past: true, title: saveTheDate.title };
    }
    return {
      past: false,
      title: saveTheDate.title,
      allDay: saveTheDate.allDay,
      startsAt: saveTheDate.startsAt.toISOString(),
      endsAt: saveTheDate.endsAt?.toISOString() ?? null,
      timeZone: saveTheDate.timeZone,
      locationName: saveTheDate.locationName,
      note: saveTheDate.note,
      cover: saveTheDate.cover ? { ...saveTheDate.cover } : null,
    };
  }
}
