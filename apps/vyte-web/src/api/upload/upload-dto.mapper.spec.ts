import { UploadDtoMapper } from './upload-dto.mapper';
import { UploadDto } from './upload.dto';

const DTO: UploadDto = {
  eventTitle: 'Sommerfest',
  guestName: 'Grace',
  photos: [{ id: 'p1', width: 2560, height: 1440, createdAt: '2027-06-12T18:00:00.000Z' }],
  limit: 6,
  left: 5,
  open: true,
  opensAt: '2027-06-12T16:00:00.000Z',
  closesAt: '2027-06-19T22:00:00.000Z',
};

describe('UploadDtoMapper', () => {
  const mapper = new UploadDtoMapper();

  it('converts the ISO timestamps of a DTO into dates', () => {
    expect(mapper.toModel(DTO)).toEqual({
      eventTitle: 'Sommerfest',
      guestName: 'Grace',
      photos: [
        { id: 'p1', width: 2560, height: 1440, createdAt: new Date(DTO.photos[0].createdAt) },
      ],
      limit: 6,
      left: 5,
      open: true,
      opensAt: new Date(DTO.opensAt),
      closesAt: new Date(DTO.closesAt),
    });
  });

  it('converts an upload page back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });
});
