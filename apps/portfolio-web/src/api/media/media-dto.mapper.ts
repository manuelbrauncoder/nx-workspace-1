import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Media } from './media';
import { MediaDto } from './media.dto';

@Service()
export class MediaDtoMapper extends DtoMapper<MediaDto, Media> {
  toModel(dto: MediaDto): Media {
    return {
      id: dto.id,
      url: dto.url,
      width: dto.width,
      height: dto.height,
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(media: Media): MediaDto {
    return {
      id: media.id,
      url: media.url,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt.toISOString(),
    };
  }
}
