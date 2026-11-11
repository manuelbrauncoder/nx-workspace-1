import { EditorInviteDtoMapper } from './editor-invite-dto.mapper';
import { MemberDtoMapper } from './member-dto.mapper';
import { EditorInviteDto, MemberDto } from './member.dto';

const MEMBER_DTO: MemberDto = {
  userId: 'u1',
  name: null,
  email: 'ada@example.com',
  role: 'owner',
  joinedAt: '2026-11-11T09:00:00.000Z',
};
const INVITE_DTO: EditorInviteDto = {
  id: 'i1',
  token: 'tok',
  expiresAt: '2026-11-18T09:00:00.000Z',
  createdAt: '2026-11-11T09:00:00.000Z',
};

describe('MemberDtoMapper', () => {
  const mapper = new MemberDtoMapper();

  it('converts the ISO timestamp of a DTO into a date', () => {
    expect(mapper.toModel(MEMBER_DTO)).toEqual({
      userId: 'u1',
      name: null,
      email: 'ada@example.com',
      role: 'owner',
      joinedAt: new Date(MEMBER_DTO.joinedAt),
    });
  });

  it('converts a member back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(MEMBER_DTO))).toEqual(MEMBER_DTO);
  });

  it('names the new owner of a handover', () => {
    expect(mapper.toHandOverDto('u2')).toEqual({ userId: 'u2' });
  });
});

describe('EditorInviteDtoMapper', () => {
  const mapper = new EditorInviteDtoMapper();

  it('converts the ISO timestamps of a DTO into dates', () => {
    expect(mapper.toModel(INVITE_DTO)).toEqual({
      id: 'i1',
      token: 'tok',
      expiresAt: new Date(INVITE_DTO.expiresAt),
      createdAt: new Date(INVITE_DTO.createdAt),
    });
  });

  it('converts an invite back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(INVITE_DTO))).toEqual(INVITE_DTO);
  });
});
