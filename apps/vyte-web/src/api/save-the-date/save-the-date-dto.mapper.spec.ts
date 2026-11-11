import { SaveTheDateDtoMapper } from './save-the-date-dto.mapper';
import { SaveTheDateDto } from './save-the-date.dto';

const DTO: SaveTheDateDto = {
  past: false,
  title: 'Sommerfest',
  allDay: true,
  startsAt: '2027-06-11T22:00:00.000Z',
  endsAt: null,
  timeZone: 'Europe/Berlin',
  locationName: 'Alte Mühle',
  note: 'Einladung folgt',
  cover: { width: 1600, height: 900 },
};
const PAST_DTO: SaveTheDateDto = { past: true, title: 'Sommerfest' };

describe('SaveTheDateDtoMapper', () => {
  const mapper = new SaveTheDateDtoMapper();

  it('converts the start of an upcoming event into a date', () => {
    expect(mapper.toModel(DTO)).toEqual({
      past: false,
      title: 'Sommerfest',
      allDay: true,
      startsAt: new Date('2027-06-11T22:00:00.000Z'),
      endsAt: null,
      timeZone: 'Europe/Berlin',
      locationName: 'Alte Mühle',
      note: 'Einladung folgt',
      cover: { width: 1600, height: 900 },
    });
  });

  it('keeps only the title of a past event', () => {
    expect(mapper.toModel(PAST_DTO)).toEqual({ past: true, title: 'Sommerfest' });
  });

  it('converts both kinds back into their DTO', () => {
    const withEnd: SaveTheDateDto = { ...DTO, endsAt: '2027-06-12T22:00:00.000Z', cover: null };

    expect(mapper.toDtos(mapper.toModels([DTO, withEnd, PAST_DTO]))).toEqual([
      DTO,
      withEnd,
      PAST_DTO,
    ]);
  });
});
