import { TestBed } from '@angular/core/testing';
import { EventsRepository } from '@api/events/events.repository';
import { GuestsRepository } from '@api/guests/guests.repository';
import { of } from 'rxjs';
import { GuestsUseCase } from './guests.usecase';

describe('GuestsUseCase', () => {
  const guests = {
    getAll: vi.fn(),
    create: vi.fn(),
    createBulk: vi.fn(),
    update: vi.fn(),
    setResponse: vi.fn(),
    delete: vi.fn(),
    renewToken: vi.fn(),
    exportUrl: vi.fn(),
  };
  const events = { getById: vi.fn() };
  let useCase: GuestsUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: GuestsRepository, useValue: guests },
        { provide: EventsRepository, useValue: events },
        GuestsUseCase,
      ],
    });
    useCase = TestBed.inject(GuestsUseCase);
  });

  it('loads the event through the events repository', () => {
    const result = of({ id: 'e1' });
    events.getById.mockReturnValue(result);

    expect(useCase.getEvent('e1')).toBe(result);
    expect(events.getById).toHaveBeenCalledWith('e1');
  });

  it.each([
    ['getAll', 'getAll', ['e1']],
    ['create', 'create', ['e1', { name: 'Ada', note: '', maxCompanions: 1 }]],
    ['createBulk', 'createBulk', ['e1', { names: ['Ada'], maxCompanions: 0 }]],
    ['update', 'update', ['e1', 'g1', { name: 'Ada', note: '', maxCompanions: 1 }]],
    ['setResponse', 'setResponse', ['e1', 'g1', { response: 'accepted', companions: 1 }]],
    ['delete', 'delete', ['e1', 'g1']],
    ['renewToken', 'renewToken', ['e1', 'g1']],
  ] as const)('passes %s through to the guests repository', (method, repositoryMethod, args) => {
    const result = of(undefined);
    guests[repositoryMethod].mockReturnValue(result);

    const call = useCase[method] as (...input: unknown[]) => unknown;

    expect(call.apply(useCase, [...args])).toBe(result);
    expect(guests[repositoryMethod]).toHaveBeenCalledWith(...args);
  });

  it('gets the address of the export from the repository', () => {
    guests.exportUrl.mockReturnValue('https://api.example.com/events/e1/guests/export?lang=de');

    expect(useCase.exportUrl('e1', 'de')).toBe(
      'https://api.example.com/events/e1/guests/export?lang=de',
    );
    expect(guests.exportUrl).toHaveBeenCalledWith('e1', 'de');
  });
});
