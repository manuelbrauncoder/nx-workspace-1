import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { of, throwError } from 'rxjs';
import { SetupUseCase } from '../domain/setup.usecase';
import { RecentPlayers } from './recent-players';
import { SetupStore } from './setup.store';

describe('SetupStore', () => {
  const useCase = { createGame: vi.fn() };
  const recent = { load: vi.fn(() => ['Grace', 'Ada']), remember: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: SetupUseCase, useValue: useCase },
        { provide: RecentPlayers, useValue: recent },
        SetupStore,
      ],
    });
  });

  it('adds trimmed, unique names and reorders them', () => {
    const store = TestBed.inject(SetupStore);
    store.addPlayer(' Ada ');
    store.addPlayer('ada');
    store.addPlayer('   ');
    store.addPlayer('Linus');
    store.move(1, -1);
    store.move(0, -1);

    expect(store.players()).toEqual(['Linus', 'Ada']);

    store.removePlayer(0);
    expect(store.players()).toEqual(['Ada']);
  });

  it('offers only remembered names that are not in the list', () => {
    const store = TestBed.inject(SetupStore);
    store.loadRecent();
    store.addPlayer('ada');

    expect(store.recentNames()).toEqual(['Grace']);
  });

  it('starts the game in the order of the list and remembers the names', async () => {
    const store = TestBed.inject(SetupStore);
    store.addPlayer('Ada');
    store.addPlayer('Linus');
    useCase.createGame.mockReturnValue(of({ id: 'g1' }));

    expect(await store.start(false)).toEqual({ id: 'g1' });
    expect(useCase.createGame).toHaveBeenCalledWith({ names: ['Ada', 'Linus'], doubleOut: false });
    expect(recent.remember).toHaveBeenCalledWith(['Ada', 'Linus']);
  });

  it('keeps the failure when the game cannot be started', async () => {
    const store = TestBed.inject(SetupStore);
    store.addPlayer('Ada');
    useCase.createGame.mockReturnValue(throwError(() => new Failure('server', 'down')));

    expect(await store.start(true)).toBeUndefined();
    expect(store.mutationState().loadingState).toBe('failure');
    expect(recent.remember).not.toHaveBeenCalled();
  });
});
