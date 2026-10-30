// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  ContactMessageDto as ReceivedMessageDto,
  UpdateMessageDto as ReceivedMessageReadDto,
  ContactMessageResponseDto as ReceivedMessageResponseDto,
  ContactMessagesResponseDto as ReceivedMessagesResponseDto,
} from '@portfolio/contracts/contact';
