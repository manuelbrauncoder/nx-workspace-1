import { TestBed } from '@angular/core/testing';
import { GamesRepository } from '@api/games/games.repository';
import { firstValueFrom, of } from 'rxjs';
import { GameUseCase } from './game.usecase';

describe('GameUseCase', () => {
  const game = { id: 'g1' };
  const repository = {
    getById: vi.fn(() => of(game)),
    throwDart: vi.fn(() => of(game)),
    undo: vi.fn(() => of(game)),
    restart: vi.fn(() => of(game)),
    setDoubleOut: vi.fn(() => of(game)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: GamesRepository, useValue: repository }, GameUseCase],
    });
  });

  it('passes every call on to the repository', async () => {
    const useCase = TestBed.inject(GameUseCase);
    await firstValueFrom(useCase.getById('g1'));
    await firstValueFrom(useCase.throwDart('g1', { multiplier: 3, value: 20 }));
    await firstValueFrom(useCase.undo('g1'));
    await firstValueFrom(useCase.restart('g1'));
    await firstValueFrom(useCase.setDoubleOut('g1', false));

    expect(repository.getById).toHaveBeenCalledWith('g1');
    expect(repository.throwDart).toHaveBeenCalledWith('g1', { multiplier: 3, value: 20 });
    expect(repository.undo).toHaveBeenCalledWith('g1');
    expect(repository.restart).toHaveBeenCalledWith('g1');
    expect(repository.setDoubleOut).toHaveBeenCalledWith('g1', false);
  });
});
