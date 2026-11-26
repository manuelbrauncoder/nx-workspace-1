import { TestBed } from '@angular/core/testing';
import { RsvpRepository } from '@api/rsvp/rsvp.repository';
import { of } from 'rxjs';
import { RsvpUseCase } from './rsvp.usecase';

describe('RsvpUseCase', () => {
  const repository = {
    getByToken: vi.fn(),
    answer: vi.fn(),
    imageUrl: vi.fn(),
    previewImage: vi.fn(),
    calendarUrl: vi.fn(),
  };
  let useCase: RsvpUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: RsvpRepository, useValue: repository }, RsvpUseCase],
    });
    useCase = TestBed.inject(RsvpUseCase);
  });

  it('loads the invitation of a token', () => {
    const result = of({ past: true });
    repository.getByToken.mockReturnValue(result);

    expect(useCase.getByToken('tok')).toBe(result);
    expect(repository.getByToken).toHaveBeenCalledWith('tok');
  });

  it('sends the answer', () => {
    const result = of({ past: true });
    const answer = { response: 'accepted', companions: 1, message: 'Gern' } as const;
    repository.answer.mockReturnValue(result);

    expect(useCase.answer('tok', answer)).toBe(result);
    expect(repository.answer).toHaveBeenCalledWith('tok', answer);
  });

  it('gives the addresses of an image and the calendar file', () => {
    repository.imageUrl.mockReturnValue('image-url');
    repository.calendarUrl.mockReturnValue('calendar-url');

    expect(useCase.imageUrl('tok', 'i1')).toBe('image-url');
    expect(repository.imageUrl).toHaveBeenCalledWith('tok', 'i1');
    expect(useCase.calendarUrl('tok')).toBe('calendar-url');
    expect(repository.calendarUrl).toHaveBeenCalledWith('tok');
  });

  it('passes the preview image through', () => {
    const preview = { url: 'preview-url', width: 1200, height: 630 };
    repository.previewImage.mockReturnValue(preview);

    expect(useCase.previewImage('tok')).toBe(preview);
    expect(repository.previewImage).toHaveBeenCalledWith('tok');
  });
});
