import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { DtoMapper } from '../dto-mapper';
import { Note, NoteDraft, NoteImage } from './note';
import { NoteDraftDto, NoteDto, NoteImageDto } from './note.dto';

@Service()
export class NoteDtoMapper extends DtoMapper<NoteDto, Note> {
  private readonly _config = inject(AppConfigService);

  toModel(dto: NoteDto): Note {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      images: this.toImageModels(dto.id, dto.images),
    };
  }

  toDto(note: Note): NoteDto {
    return {
      id: note.id,
      title: note.title,
      description: note.description,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      images: note.images.map((image) => ({
        id: image.id,
        width: image.width,
        height: image.height,
        createdAt: image.createdAt.toISOString(),
      })),
    };
  }

  /** An image record does not say which note it belongs to, its address needs both ids. */
  toImageModels(noteId: string, dtos: NoteImageDto[]): NoteImage[] {
    return dtos.map((dto) => ({
      id: dto.id,
      url: `${this._config.apiBaseUrl}/notes/${encodeURIComponent(noteId)}/images/${encodeURIComponent(dto.id)}`,
      width: dto.width,
      height: dto.height,
      createdAt: new Date(dto.createdAt),
    }));
  }

  /** Creating and updating send only the editable fields. */
  toDraftDto(draft: NoteDraft): NoteDraftDto {
    return { title: draft.title.trim(), description: draft.description };
  }
}
