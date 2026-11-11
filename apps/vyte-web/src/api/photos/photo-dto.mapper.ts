import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Photo } from './photo';
import { HidePhotoDto, PhotoDto } from './photo.dto';

@Service()
export class PhotoDtoMapper extends DtoMapper<PhotoDto, Photo> {
  toModel(dto: PhotoDto): Photo {
    return {
      id: dto.id,
      source: dto.source,
      uploaderName: dto.uploaderName,
      width: dto.width,
      height: dto.height,
      hidden: dto.hidden,
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(photo: Photo): PhotoDto {
    return {
      id: photo.id,
      source: photo.source,
      uploaderName: photo.uploaderName,
      width: photo.width,
      height: photo.height,
      hidden: photo.hidden,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  toHideDto(hidden: boolean): HidePhotoDto {
    return { hidden };
  }
}
