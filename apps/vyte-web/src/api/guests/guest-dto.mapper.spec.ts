import { GuestDtoMapper } from './guest-dto.mapper';
import { GuestDto } from './guest.dto';

const DTO: GuestDto = {
  id: 'g1',
  name: 'Ada',
  note: 'Vegetarisch',
  maxCompanions: 2,
  token: 'rsvp',
  photoToken: 'photo',
  response: 'accepted',
  companions: 1,
  companionsReduced: false,
  message: 'Ich freue mich',
  answeredBy: 'guest',
  respondedAt: '2026-11-12T09:00:00.000Z',
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-12T09:00:00.000Z',
};
const PENDING_DTO: GuestDto = {
  ...DTO,
  note: null,
  response: 'pending',
  companions: 0,
  message: null,
  answeredBy: null,
  respondedAt: null,
};

describe('GuestDtoMapper', () => {
  const mapper = new GuestDtoMapper();

  it('converts the ISO timestamps of a DTO into dates', () => {
    const guest = mapper.toModel(DTO);

    expect(guest.respondedAt).toEqual(new Date('2026-11-12T09:00:00.000Z'));
    expect(guest.createdAt).toEqual(new Date(DTO.createdAt));
    expect(guest).toMatchObject({ name: 'Ada', response: 'accepted', companions: 1 });
  });

  it('keeps a missing answer as null', () => {
    expect(mapper.toModel(PENDING_DTO)).toMatchObject({
      note: null,
      message: null,
      answeredBy: null,
      respondedAt: null,
    });
  });

  it('converts a guest back into its DTO', () => {
    expect(mapper.toDtos(mapper.toModels([DTO, PENDING_DTO]))).toEqual([DTO, PENDING_DTO]);
  });

  it('trims a draft and sends an empty note as null', () => {
    expect(mapper.toDraftDto({ name: ' Ada ', note: '  ', maxCompanions: 1 })).toEqual({
      name: 'Ada',
      note: null,
      maxCompanions: 1,
    });
  });

  it('leaves the empty lines of a pasted list out', () => {
    expect(mapper.toBulkDto({ names: [' Ada ', '', '  ', 'Linus'], maxCompanions: 0 })).toEqual({
      names: ['Ada', 'Linus'],
      maxCompanions: 0,
    });
  });

  it('sends no companions with a decline', () => {
    expect(mapper.toHostAnswerDto({ response: 'declined', companions: 2 })).toEqual({
      response: 'declined',
      companions: 0,
    });
    expect(mapper.toHostAnswerDto({ response: 'accepted', companions: 2 })).toEqual({
      response: 'accepted',
      companions: 2,
    });
  });
});
