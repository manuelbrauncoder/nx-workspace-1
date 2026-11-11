import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Upload } from './upload';
import { UploadDto } from './upload.dto';

@Service()
export class UploadDtoMapper extends DtoMapper<UploadDto, Upload> {
  toModel(dto: UploadDto): Upload {
    return {
      eventTitle: dto.eventTitle,
      guestName: dto.guestName,
      photos: dto.photos.map((photo) => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        createdAt: new Date(photo.createdAt),
      })),
      limit: dto.limit,
      left: dto.left,
      open: dto.open,
      opensAt: new Date(dto.opensAt),
      closesAt: new Date(dto.closesAt),
    };
  }

  toDto(upload: Upload): UploadDto {
    return {
      eventTitle: upload.eventTitle,
      guestName: upload.guestName,
      photos: upload.photos.map((photo) => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt.toISOString(),
      })),
      limit: upload.limit,
      left: upload.left,
      open: upload.open,
      opensAt: upload.opensAt.toISOString(),
      closesAt: upload.closesAt.toISOString(),
    };
  }
}
