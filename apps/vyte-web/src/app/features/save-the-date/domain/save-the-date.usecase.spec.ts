import { TestBed } from '@angular/core/testing';
import { SaveTheDateRepository } from '@api/save-the-date/save-the-date.repository';
import { of } from 'rxjs';
import { SaveTheDateUseCase } from './save-the-date.usecase';

describe('SaveTheDateUseCase', () => {
  const repository = {
    getByToken: vi.fn(),
    coverUrl: vi.fn(),
    calendarUrl: vi.fn(),
  };
  let useCase: SaveTheDateUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: SaveTheDateRepository, useValue: repository }, SaveTheDateUseCase],
    });
    useCase = TestBed.inject(SaveTheDateUseCase);
  });

  it('loads the page of a token', () => {
    const result = of({ past: true, title: 'Sommerfest' });
    repository.getByToken.mockReturnValue(result);

    expect(useCase.getByToken('tok')).toBe(result);
    expect(repository.getByToken).toHaveBeenCalledWith('tok');
  });

  it('gives the addresses of the cover and the calendar file', () => {
    repository.coverUrl.mockReturnValue('cover-url');
    repository.calendarUrl.mockReturnValue('calendar-url');

    expect(useCase.coverUrl('tok')).toBe('cover-url');
    expect(repository.coverUrl).toHaveBeenCalledWith('tok');
    expect(useCase.calendarUrl('tok')).toBe('calendar-url');
    expect(repository.calendarUrl).toHaveBeenCalledWith('tok');
  });
});
