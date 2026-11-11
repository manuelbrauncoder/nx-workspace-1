import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { InvitePreview } from './invite-preview';
import { InvitePreviewDto } from './invite-preview.dto';

@Service()
export class InvitePreviewDtoMapper extends DtoMapper<InvitePreviewDto, InvitePreview> {
  toModel(dto: InvitePreviewDto): InvitePreview {
    return {
      eventTitle: dto.eventTitle,
      startsAt: new Date(dto.startsAt),
      allDay: dto.allDay,
      timeZone: dto.timeZone,
      ownerName: dto.ownerName,
    };
  }

  toDto(preview: InvitePreview): InvitePreviewDto {
    return {
      eventTitle: preview.eventTitle,
      startsAt: preview.startsAt.toISOString(),
      allDay: preview.allDay,
      timeZone: preview.timeZone,
      ownerName: preview.ownerName,
    };
  }
}
