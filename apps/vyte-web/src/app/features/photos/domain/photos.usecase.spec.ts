import { TestBed } from '@angular/core/testing';
import { EventsRepository } from '@api/events/events.repository';
import { PhotosRepository } from '@api/photos/photos.repository';
import { of } from 'rxjs';
import { PhotosUseCase } from './photos.usecase';

describe('PhotosUseCase', () => {
  const photos = {
    getAll: vi.fn(),
    setHidden: vi.fn(),
    delete: vi.fn(),
    photoUrl: vi.fn(),
    archiveUrl: vi.fn(),
  };
  const events = { getById: vi.fn() };
  let useCase: PhotosUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PhotosRepository, useValue: photos },
        { provide: EventsRepository, useValue: events },
        PhotosUseCase,
      ],
    });
    useCase = TestBed.inject(PhotosUseCase);
  });

  it('loads the event through the events repository', () => {
    const result = of({ id: 'e1' });
    events.getById.mockReturnValue(result);

    expect(useCase.getEvent('e1')).toBe(result);
    expect(events.getById).toHaveBeenCalledWith('e1');
  });

  it.each([
    ['getAll', ['e1']],
    ['setHidden', ['e1', 'p1', true]],
    ['delete', ['e1', 'p1']],
  ] as const)('passes %s through to the photos repository', (method, args) => {
    const result = of(undefined);
    photos[method].mockReturnValue(result);

    expect((useCase[method] as (...a: unknown[]) => unknown)(...args)).toBe(result);
    expect(photos[method]).toHaveBeenCalledWith(...args);
  });

  it('passes the addresses through', () => {
    photos.photoUrl.mockReturnValue('https://api.example.com/p');
    photos.archiveUrl.mockReturnValue('https://api.example.com/zip');

    expect(useCase.photoUrl('e1', 'p1')).toBe('https://api.example.com/p');
    expect(photos.photoUrl).toHaveBeenCalledWith('e1', 'p1');
    expect(useCase.archiveUrl('e1')).toBe('https://api.example.com/zip');
    expect(photos.archiveUrl).toHaveBeenCalledWith('e1');
  });
});
