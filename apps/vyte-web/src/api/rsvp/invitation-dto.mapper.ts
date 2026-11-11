import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { Invitation, RsvpAnswer } from './invitation';
import { InvitationDto, RsvpAnswerDto } from './invitation.dto';

@Service()
export class InvitationDtoMapper extends DtoMapper<InvitationDto, Invitation> {
  toModel(dto: InvitationDto): Invitation {
    if (dto.past) {
      return { past: true, event: { title: dto.event.title } };
    }
    const { event, guest } = dto;
    return {
      past: false,
      open: dto.open,
      event: {
        title: event.title,
        description: event.description,
        locationName: event.locationName,
        address: event.address,
        allDay: event.allDay,
        startsAt: new Date(event.startsAt),
        endsAt: event.endsAt ? new Date(event.endsAt) : null,
        timeZone: event.timeZone,
        rsvpDeadline: event.rsvpDeadline ? new Date(event.rsvpDeadline) : null,
        images: event.images.map((image) => ({ ...image })),
        hosts: [...event.hosts],
      },
      guest: {
        name: guest.name,
        maxCompanions: guest.maxCompanions,
        response: guest.response,
        companions: guest.companions,
        message: guest.message,
        respondedAt: guest.respondedAt ? new Date(guest.respondedAt) : null,
      },
    };
  }

  toDto(invitation: Invitation): InvitationDto {
    if (invitation.past) {
      return { past: true, event: { title: invitation.event.title } };
    }
    const { event, guest } = invitation;
    return {
      past: false,
      open: invitation.open,
      event: {
        title: event.title,
        description: event.description,
        locationName: event.locationName,
        address: event.address,
        allDay: event.allDay,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        timeZone: event.timeZone,
        rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
        images: event.images.map((image) => ({ ...image })),
        hosts: [...event.hosts],
      },
      guest: {
        name: guest.name,
        maxCompanions: guest.maxCompanions,
        response: guest.response,
        companions: guest.companions,
        message: guest.message,
        respondedAt: guest.respondedAt?.toISOString() ?? null,
      },
    };
  }

  /** A decline brings nobody. An empty message is sent as `null`, so it removes an earlier one. */
  toAnswerDto(answer: RsvpAnswer): RsvpAnswerDto {
    return {
      response: answer.response,
      companions: answer.response === 'accepted' ? answer.companions : 0,
      message: answer.message.trim() || null,
    };
  }
}
