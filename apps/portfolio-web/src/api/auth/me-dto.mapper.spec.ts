import { MeDtoMapper } from './me-dto.mapper';
import { MeDto } from './me.dto';

const DTO: MeDto = {
  id: '1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
  createdAt: '2026-01-12T09:00:00.000Z',
};

describe('MeDtoMapper', () => {
  const mapper = new MeDtoMapper();

  it('converts the ISO timestamp of a DTO into a date', () => {
    expect(mapper.toModel(DTO)).toEqual({
      id: '1',
      email: 'ada@example.com',
      name: 'Ada',
      role: 'admin',
      createdAt: new Date('2026-01-12T09:00:00.000Z'),
    });
  });

  it('turns a missing name into undefined and back into null', () => {
    const me = mapper.toModel({ ...DTO, name: null });

    expect(me.name).toBeUndefined();
    expect(mapper.toDto(me).name).toBeNull();
  });

  it('converts a user back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });

  it('trims the email of credentials but leaves the password as typed', () => {
    expect(mapper.toSignInDto({ email: ' ada@example.com ', password: ' geheim ' })).toEqual({
      email: 'ada@example.com',
      password: ' geheim ',
    });
  });

  it('trims the name of a registration', () => {
    expect(
      mapper.toSignUpDto({ name: ' Ada ', email: ' ada@example.com ', password: 'geheim12' }),
    ).toEqual({ name: 'Ada', email: 'ada@example.com', password: 'geheim12' });
  });

  it('leaves out an empty name', () => {
    expect(
      mapper.toSignUpDto({ name: '  ', email: 'ada@example.com', password: 'geheim12' }),
    ).toEqual({ email: 'ada@example.com', password: 'geheim12' });
  });
});
