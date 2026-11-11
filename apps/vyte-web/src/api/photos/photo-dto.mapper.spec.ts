import { PhotoDtoMapper } from './photo-dto.mapper';
import { PhotoDto } from './photo.dto';

const DTO: PhotoDto = {
  id: 'p1',
  source: 'stand',
  uploaderName: null,
  width: 2560,
  height: 1440,
  hidden: false,
  createdAt: '2027-06-12T18:00:00.000Z',
};

describe('PhotoDtoMapper', () => {
  const mapper = new PhotoDtoMapper();

  it('converts the ISO timestamp of a DTO into a date', () => {
    expect(mapper.toModel(DTO)).toEqual({
      id: 'p1',
      source: 'stand',
      uploaderName: null,
      width: 2560,
      height: 1440,
      hidden: false,
      createdAt: new Date(DTO.createdAt),
    });
  });

  it('converts a photo back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });

  it('wraps the new visibility', () => {
    expect(mapper.toHideDto(true)).toEqual({ hidden: true });
  });
});
