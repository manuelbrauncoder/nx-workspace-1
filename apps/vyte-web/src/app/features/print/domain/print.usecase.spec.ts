import { TestBed } from '@angular/core/testing';
import { EventsRepository } from '@api/events/events.repository';
import { GuestsRepository } from '@api/guests/guests.repository';
import { of } from 'rxjs';
import { PrintUseCase } from './print.usecase';

describe('PrintUseCase', () => {
  const events = { getById: vi.fn() };
  const guests = { getAll: vi.fn() };
  let useCase: PrintUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: EventsRepository, useValue: events },
        { provide: GuestsRepository, useValue: guests },
        PrintUseCase,
      ],
    });
    useCase = TestBed.inject(PrintUseCase);
  });

  it('loads the event through the events repository', () => {
    const result = of({ id: 'e1' });
    events.getById.mockReturnValue(result);

    expect(useCase.getEvent('e1')).toBe(result);
    expect(events.getById).toHaveBeenCalledWith('e1');
  });

  it('loads the guests through the guests repository', () => {
    const result = of([]);
    guests.getAll.mockReturnValue(result);

    expect(useCase.getGuests('e1')).toBe(result);
    expect(guests.getAll).toHaveBeenCalledWith('e1');
  });
});
