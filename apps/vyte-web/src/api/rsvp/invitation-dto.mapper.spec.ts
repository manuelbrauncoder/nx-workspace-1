import { InvitationDtoMapper } from './invitation-dto.mapper';
import { InvitationDto } from './invitation.dto';

const DTO: InvitationDto = {
  past: false,
  open: true,
  event: {
    title: 'Sommerfest',
    description: '<p>Kommt vorbei</p>',
    locationName: 'Alte Mühle',
    address: null,
    allDay: false,
    startsAt: '2027-06-12T16:00:00.000Z',
    endsAt: '2027-06-12T22:00:00.000Z',
    timeZone: 'Europe/Berlin',
    rsvpDeadline: '2027-06-01T21:59:59.000Z',
    images: [{ id: 'i1', width: 1600, height: 900, position: 0 }],
    hosts: ['Ada', 'Linus'],
  },
  guest: {
    name: 'Grace',
    maxCompanions: 2,
    response: 'accepted',
    companions: 1,
    message: 'Ich freue mich',
    respondedAt: '2026-11-12T09:00:00.000Z',
  },
};
const PAST_DTO: InvitationDto = { past: true, event: { title: 'Sommerfest' } };

describe('InvitationDtoMapper', () => {
  const mapper = new InvitationDtoMapper();

  it('converts the timestamps of an upcoming event into dates', () => {
    const invitation = mapper.toModel(DTO);

    expect(invitation).toMatchObject({
      past: false,
      open: true,
      event: {
        startsAt: new Date('2027-06-12T16:00:00.000Z'),
        endsAt: new Date('2027-06-12T22:00:00.000Z'),
        rsvpDeadline: new Date('2027-06-01T21:59:59.000Z'),
        hosts: ['Ada', 'Linus'],
      },
      guest: { name: 'Grace', respondedAt: new Date('2026-11-12T09:00:00.000Z') },
    });
  });

  it('keeps only the title of a past event', () => {
    expect(mapper.toModel(PAST_DTO)).toEqual({ past: true, event: { title: 'Sommerfest' } });
  });

  it('converts an invitation back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
    expect(mapper.toDto(mapper.toModel(PAST_DTO))).toEqual(PAST_DTO);
  });

  it('keeps a guest without an answer and an event without an end', () => {
    const dto: InvitationDto = {
      ...DTO,
      event: { ...DTO.event, endsAt: null, rsvpDeadline: null },
      guest: { ...DTO.guest, response: 'pending', companions: 0, message: null, respondedAt: null },
    };

    expect(mapper.toDto(mapper.toModel(dto))).toEqual(dto);
  });

  it('trims the message of an answer and sends an empty one as null', () => {
    expect(
      mapper.toAnswerDto({ response: 'accepted', companions: 2, message: ' Bis dann ' }),
    ).toEqual({ response: 'accepted', companions: 2, message: 'Bis dann' });
    expect(mapper.toAnswerDto({ response: 'declined', companions: 2, message: ' ' })).toEqual({
      response: 'declined',
      companions: 0,
      message: null,
    });
  });
});
