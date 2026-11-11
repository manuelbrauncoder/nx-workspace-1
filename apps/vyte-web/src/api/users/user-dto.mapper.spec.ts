import { UserDtoMapper } from './user-dto.mapper';
import { UserDto } from './user.dto';

const DTO: UserDto = {
  id: '1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
  createdAt: '2026-01-12T09:00:00.000Z',
};

describe('UserDtoMapper', () => {
  const mapper = new UserDtoMapper();

  it('converts the ISO timestamp of a DTO into a date', () => {
    expect(mapper.toModel(DTO).createdAt).toEqual(new Date('2026-01-12T09:00:00.000Z'));
  });

  it('turns a missing name into undefined and back into null', () => {
    const user = mapper.toModel({ ...DTO, name: null });

    expect(user.name).toBeUndefined();
    expect(mapper.toDto(user).name).toBeNull();
  });

  it('converts a user back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });
});
