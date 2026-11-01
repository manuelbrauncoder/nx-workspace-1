import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { ContactMessage } from './contact-message';
import { ContactMessageDto } from './contact-message.dto';

@Service()
export class ContactMessageDtoMapper extends DtoMapper<ContactMessageDto, ContactMessage> {
  toModel(dto: ContactMessageDto): ContactMessage {
    return { name: dto.name, email: dto.email, message: dto.message };
  }

  /** Sends the fields without surrounding whitespace, the backend checks them as they arrive. */
  toDto(message: ContactMessage): ContactMessageDto {
    return {
      name: message.name.trim(),
      email: message.email.trim(),
      message: message.message.trim(),
    };
  }
}
