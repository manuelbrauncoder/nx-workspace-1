import { TestBed } from '@angular/core/testing';
import { EventsRepository } from '@api/events/events.repository';
import { TeamRepository } from '@api/team/team.repository';
import { of } from 'rxjs';
import { TeamUseCase } from './team.usecase';

describe('TeamUseCase', () => {
  const team = {
    getMembers: vi.fn(),
    removeMember: vi.fn(),
    handOver: vi.fn(),
    getInvites: vi.fn(),
    createInvite: vi.fn(),
    deleteInvite: vi.fn(),
  };
  const events = { getById: vi.fn() };
  let useCase: TeamUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: TeamRepository, useValue: team },
        { provide: EventsRepository, useValue: events },
        TeamUseCase,
      ],
    });
    useCase = TestBed.inject(TeamUseCase);
  });

  it('loads the event through the events repository', () => {
    const result = of({ id: 'e1' });
    events.getById.mockReturnValue(result);

    expect(useCase.getEvent('e1')).toBe(result);
    expect(events.getById).toHaveBeenCalledWith('e1');
  });

  it.each([
    ['getMembers', ['e1']],
    ['removeMember', ['e1', 'u2']],
    ['handOver', ['e1', 'u2']],
    ['getInvites', ['e1']],
    ['createInvite', ['e1']],
    ['deleteInvite', ['e1', 'i1']],
  ] as const)('passes %s through to the team repository', (method, args) => {
    const result = of(undefined);
    team[method].mockReturnValue(result);

    const call = useCase[method] as (...input: unknown[]) => unknown;

    expect(call.apply(useCase, [...args])).toBe(result);
    expect(team[method]).toHaveBeenCalledWith(...args);
  });
});
