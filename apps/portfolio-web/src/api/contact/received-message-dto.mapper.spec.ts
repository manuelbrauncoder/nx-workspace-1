import { ReceivedMessageDtoMapper } from './received-message-dto.mapper';
import { ReceivedMessageDto } from './received-message.dto';

const DTO: ReceivedMessageDto = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hallo!',
  read: true,
  createdAt: '2026-10-20T08:15:00.000Z',
};

describe('ReceivedMessageDtoMapper', () => {
  const mapper = new ReceivedMessageDtoMapper();

  it('converts the ISO timestamp of a DTO into a date', () => {
    expect(mapper.toModel(DTO).createdAt).toEqual(new Date('2026-10-20T08:15:00.000Z'));
  });

  it('converts a message back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });
});
