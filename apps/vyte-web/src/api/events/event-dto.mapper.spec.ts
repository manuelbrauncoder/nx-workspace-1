import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { EventDraft } from './event';
import { EventDtoMapper } from './event-dto.mapper';
import { EventDto } from './event.dto';

const DTO: EventDto = {
  id: 'e1',
  title: 'Sommerfest',
  description: '<p>Kommt vorbei</p>',
  locationName: 'Alte Mühle',
  address: 'Mühlweg 1, 12345 Musterstadt',
  allDay: false,
  startsAt: '2027-06-12T16:00:00.000Z',
  endsAt: '2027-06-12T22:00:00.000Z',
  timeZone: 'Europe/Berlin',
  rsvpDeadline: '2027-06-01T21:59:59.000Z',
  role: 'owner',
  past: false,
  images: [{ id: 'a/b', width: 1600, height: 900, position: 0 }],
  counts: { invited: 3, coming: 4, declined: 1, pending: 0, atMost: 6 },
  saveTheDate: { token: 'std', note: 'Haltet euch den Tag frei' },
  photoStand: { token: 'stand' },
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T10:00:00.000Z',
};
const BARE_DTO: EventDto = {
  ...DTO,
  locationName: null,
  address: null,
  endsAt: null,
  rsvpDeadline: null,
  images: [],
  saveTheDate: null,
  photoStand: null,
};
const DRAFT: EventDraft = {
  title: ' Sommerfest ',
  description: '<p>Kommt vorbei</p>',
  locationName: ' Alte Mühle ',
  address: '',
  allDay: true,
  startsAt: new Date('2027-06-11T22:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
};

describe('EventDtoMapper', () => {
  let mapper: EventDtoMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    mapper = TestBed.inject(EventDtoMapper);
  });

  it('converts the timestamps into dates and gives every image its address', () => {
    const event = mapper.toModel(DTO);

    expect(event.startsAt).toEqual(new Date(DTO.startsAt));
    expect(event.endsAt).toEqual(new Date('2027-06-12T22:00:00.000Z'));
    expect(event.rsvpDeadline).toEqual(new Date('2027-06-01T21:59:59.000Z'));
    expect(event.images).toEqual([
      {
        id: 'a/b',
        url: 'https://api.example.com/events/e1/images/a%2Fb',
        width: 1600,
        height: 900,
        position: 0,
      },
    ]);
    expect(event.counts).toEqual(DTO.counts);
    expect(event.saveTheDate).toEqual({ token: 'std', note: 'Haltet euch den Tag frei' });
    expect(event.photoStand).toEqual({ token: 'stand' });
  });

  it('keeps what an event does not have as null', () => {
    const event = mapper.toModel(BARE_DTO);

    expect(event.endsAt).toBeNull();
    expect(event.rsvpDeadline).toBeNull();
    expect(event.locationName).toBeNull();
    expect(event.saveTheDate).toBeNull();
    expect(event.photoStand).toBeNull();
  });

  it('converts an event back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
    expect(mapper.toDto(mapper.toModel(BARE_DTO))).toEqual(BARE_DTO);
  });

  it('maps a list in both directions', () => {
    const events = mapper.toModels([DTO, BARE_DTO]);

    expect(mapper.toDtos(events)).toEqual([DTO, BARE_DTO]);
  });

  it('trims a draft and sends an empty location or address as null', () => {
    expect(mapper.toDraftDto(DRAFT)).toEqual({
      title: 'Sommerfest',
      description: '<p>Kommt vorbei</p>',
      locationName: 'Alte Mühle',
      address: null,
      allDay: true,
      startsAt: '2027-06-11T22:00:00.000Z',
      endsAt: null,
      timeZone: 'Europe/Berlin',
      rsvpDeadline: null,
    });
  });

  it('sends the order of the images as their ids', () => {
    const [first] = mapper.toImageModels('e1', DTO.images);

    expect(mapper.toOrderDto([{ ...first, id: 'i2' }, first])).toEqual({ ids: ['i2', 'a/b'] });
  });

  it('sends an empty save-the-date note as null', () => {
    expect(mapper.toSaveTheDateDto('  ')).toEqual({ note: null });
    expect(mapper.toSaveTheDateDto(' Bis bald ')).toEqual({ note: 'Bis bald' });
  });
});
