import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { DtoMapper } from '../dto-mapper';
import { EventDraft, EventImage, VyteEvent } from './event';
import {
  CreateEventDto,
  EventDto,
  EventImageDto,
  ReorderEventImagesDto,
  SaveTheDateSettingsDto,
} from './event.dto';

@Service()
export class EventDtoMapper extends DtoMapper<EventDto, VyteEvent> {
  private readonly _config = inject(AppConfigService);

  toModel(dto: EventDto): VyteEvent {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      locationName: dto.locationName,
      address: dto.address,
      allDay: dto.allDay,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      timeZone: dto.timeZone,
      rsvpDeadline: dto.rsvpDeadline ? new Date(dto.rsvpDeadline) : null,
      role: dto.role,
      past: dto.past,
      images: this.toImageModels(dto.id, dto.images),
      counts: { ...dto.counts },
      saveTheDate: dto.saveTheDate ? { ...dto.saveTheDate } : null,
      photoStand: dto.photoStand ? { ...dto.photoStand } : null,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  }

  toDto(event: VyteEvent): EventDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      locationName: event.locationName,
      address: event.address,
      allDay: event.allDay,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      timeZone: event.timeZone,
      rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
      role: event.role,
      past: event.past,
      images: event.images.map((image) => ({
        id: image.id,
        width: image.width,
        height: image.height,
        position: image.position,
      })),
      counts: { ...event.counts },
      saveTheDate: event.saveTheDate ? { ...event.saveTheDate } : null,
      photoStand: event.photoStand ? { ...event.photoStand } : null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /** An image record does not say which event it belongs to, its address needs both ids. */
  toImageModels(eventId: string, dtos: EventImageDto[]): EventImage[] {
    return dtos.map((dto) => ({
      id: dto.id,
      url: `${this._config.apiBaseUrl}/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(dto.id)}`,
      width: dto.width,
      height: dto.height,
      position: dto.position,
    }));
  }

  /**
   * Creating and updating send every editable field. An empty location or address is sent as
   * `null`, so an update removes it.
   */
  toDraftDto(draft: EventDraft): CreateEventDto {
    return {
      title: draft.title.trim(),
      description: draft.description,
      locationName: draft.locationName.trim() || null,
      address: draft.address.trim() || null,
      allDay: draft.allDay,
      startsAt: draft.startsAt.toISOString(),
      endsAt: draft.endsAt?.toISOString() ?? null,
      timeZone: draft.timeZone,
      rsvpDeadline: draft.rsvpDeadline?.toISOString() ?? null,
    };
  }

  /** The ids of every image of the event in their new order. */
  toOrderDto(images: EventImage[]): ReorderEventImagesDto {
    return { ids: images.map((image) => image.id) };
  }

  toSaveTheDateDto(note: string): SaveTheDateSettingsDto {
    return { note: note.trim() || null };
  }
}
