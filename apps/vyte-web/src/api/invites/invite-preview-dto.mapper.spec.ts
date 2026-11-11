import { InvitePreviewDtoMapper } from './invite-preview-dto.mapper';
import { InvitePreviewDto } from './invite-preview.dto';

const DTO: InvitePreviewDto = {
  eventTitle: 'Sommerfest',
  startsAt: '2027-06-12T16:00:00.000Z',
  allDay: false,
  timeZone: 'Europe/Berlin',
  ownerName: null,
};

describe('InvitePreviewDtoMapper', () => {
  const mapper = new InvitePreviewDtoMapper();

  it('converts the start of the event into a date', () => {
    expect(mapper.toModel(DTO)).toEqual({
      eventTitle: 'Sommerfest',
      startsAt: new Date(DTO.startsAt),
      allDay: false,
      timeZone: 'Europe/Berlin',
      ownerName: null,
    });
  });

  it('converts a preview back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });
});
