import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Game } from '../domain/game';
import { GameUseCase } from '../domain/game.usecase';
import { GameStore } from './game.store';

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    startScore: 301,
    doubleOut: true,
    status: 'active',
    players: [
      { id: 'p1', name: 'Ada', score: 81 },
      { id: 'p2', name: 'Linus', score: 207 },
      { id: 'p3', name: 'Grace', score: 81 },
    ],
    currentPlayerIdx: 1,
    currentTurnDarts: [],
    winnerIdx: null,
    checkout: { status: 'hidden', route: [] },
    canUndo: false,
    createdAt: new Date('2026-11-01T09:00:00.000Z'),
    finishedAt: null,
    ...overrides,
  };
}

describe('GameStore', () => {
  const useCase = {
    getById: vi.fn(() => of(game())),
    throwDart: vi.fn(() => of(game({ canUndo: true }))),
    undo: vi.fn(),
    restart: vi.fn(),
    setDoubleOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: GameUseCase, useValue: useCase }, GameStore],
    });
  });

  async function loadedStore() {
    const store = TestBed.inject(GameStore);
    store.load('g1');
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  }

  it('loads the game and knows who is up', async () => {
    const store = await loadedStore();

    expect(useCase.getById).toHaveBeenCalledWith('g1');
    expect(store.currentPlayer()?.name).toBe('Linus');
    expect(store.isFinished()).toBe(false);
  });

  it('replaces the game with the answer of a dart', async () => {
    const store = await loadedStore();

    await store.throwDart({ multiplier: 3, value: 20 });

    expect(useCase.throwDart).toHaveBeenCalledWith('g1', { multiplier: 3, value: 20 });
    expect(store.game()?.canUndo).toBe(true);
  });

  it('ranks by the lowest score and keeps the throwing order on a tie', async () => {
    useCase.getById.mockReturnValue(
      of(
        game({
          status: 'finished',
          winnerIdx: 0,
          players: [
            { id: 'p1', name: 'Ada', score: 0 },
            { id: 'p2', name: 'Linus', score: 96 },
            { id: 'p3', name: 'Grace', score: 96 },
          ],
        }),
      ),
    );
    const store = await loadedStore();

    expect(store.winner()?.name).toBe('Ada');
    expect(store.standings().map((s) => [s.rank, s.name, s.isWinner])).toEqual([
      [1, 'Ada', true],
      [2, 'Linus', false],
      [3, 'Grace', false],
    ]);
  });
});
