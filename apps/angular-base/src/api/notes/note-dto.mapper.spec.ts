import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { NoteDtoMapper } from './note-dto.mapper';
import { NoteDto } from './note.dto';

const DTO: NoteDto = {
  id: '1',
  title: 'Titel',
  description: 'Inhalt',
  createdAt: '2026-01-12T09:00:00.000Z',
  updatedAt: '2026-01-13T14:30:00.000Z',
  images: [{ id: 'a/b', width: 800, height: 600, createdAt: '2026-01-12T09:05:00.000Z' }],
};

describe('NoteDtoMapper', () => {
  let mapper: NoteDtoMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    mapper = TestBed.inject(NoteDtoMapper);
  });

  it('converts the ISO timestamps of a DTO into dates', () => {
    expect(mapper.toModel(DTO)).toEqual({
      id: '1',
      title: 'Titel',
      description: 'Inhalt',
      createdAt: new Date('2026-01-12T09:00:00.000Z'),
      updatedAt: new Date('2026-01-13T14:30:00.000Z'),
      images: [
        {
          id: 'a/b',
          url: 'https://api.example.com/notes/1/images/a%2Fb',
          width: 800,
          height: 600,
          createdAt: new Date('2026-01-12T09:05:00.000Z'),
        },
      ],
    });
  });

  it('maps a list of DTOs', () => {
    const notes = mapper.toModels([DTO, { ...DTO, id: '2' }]);

    expect(notes.map((note) => note.id)).toEqual(['1', '2']);
    expect(notes[1].createdAt).toBeInstanceOf(Date);
  });

  it('converts a note back into its DTO', () => {
    expect(mapper.toDto(mapper.toModel(DTO))).toEqual(DTO);
  });

  it('maps a list of notes back into DTOs', () => {
    expect(mapper.toDtos(mapper.toModels([DTO, { ...DTO, id: '2' }]))).toEqual([
      DTO,
      { ...DTO, id: '2' },
    ]);
  });

  it('addresses uploaded images through their note', () => {
    expect(mapper.toImageModels('7', DTO.images)[0].url).toBe(
      'https://api.example.com/notes/7/images/a%2Fb',
    );
  });

  it('trims the title of a draft', () => {
    expect(mapper.toDraftDto({ title: '  Titel ', description: ' Inhalt ' })).toEqual({
      title: 'Titel',
      description: ' Inhalt ',
    });
  });
});
