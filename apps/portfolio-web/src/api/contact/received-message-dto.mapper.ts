import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { ReceivedMessage } from './received-message';
import { ReceivedMessageDto, ReceivedMessageReadDto } from './received-message.dto';

@Service()
export class ReceivedMessageDtoMapper extends DtoMapper<ReceivedMessageDto, ReceivedMessage> {
  toModel(dto: ReceivedMessageDto): ReceivedMessage {
    return {
      id: dto.id,
      name: dto.name,
      email: dto.email,
      message: dto.message,
      read: dto.read,
      createdAt: new Date(dto.createdAt),
    };
  }

  toDto(message: ReceivedMessage): ReceivedMessageDto {
    return {
      id: message.id,
      name: message.name,
      email: message.email,
      message: message.message,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
    };
  }

  toReadDto(read: boolean): ReceivedMessageReadDto {
    return { read };
  }
}
