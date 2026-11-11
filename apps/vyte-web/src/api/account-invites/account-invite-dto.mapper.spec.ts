import { AccountInviteDtoMapper } from './account-invite-dto.mapper';
import { AccountInviteDto } from './account-invite.dto';

const DTO: AccountInviteDto = {
  id: 'i1',
  name: 'Ada',
  token: 'tok',
  expiresAt: '2026-11-18T09:00:00.000Z',
  createdAt: '2026-11-11T09:00:00.000Z',
};

describe('AccountInviteDtoMapper', () => {
  const mapper = new AccountInviteDtoMapper();

  it('converts the ISO timestamps of a DTO into dates', () => {
    expect(mapper.toModel(DTO)).toEqual({
      id: 'i1',
      name: 'Ada',
      token: 'tok',
      expiresAt: new Date(DTO.expiresAt),
      createdAt: new Date(DTO.createdAt),
    });
  });

  it('converts a link back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });

  it('trims the name of a new link', () => {
    expect(mapper.toCreateDto(' Ada ')).toEqual({ name: 'Ada' });
  });
});
