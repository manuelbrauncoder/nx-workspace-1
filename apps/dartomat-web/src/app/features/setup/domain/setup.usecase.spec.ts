import { TestBed } from '@angular/core/testing';
import { GamesRepository } from '@api/games/games.repository';
import { firstValueFrom, of } from 'rxjs';
import { SetupUseCase } from './setup.usecase';

describe('SetupUseCase', () => {
  it('creates the game through the repository', async () => {
    const game = { id: 'g1' };
    const repository = { create: vi.fn(() => of(game)) };
    TestBed.configureTestingModule({
      providers: [{ provide: GamesRepository, useValue: repository }, SetupUseCase],
    });

    const newGame = { names: ['Ada'], doubleOut: true };
    expect(await firstValueFrom(TestBed.inject(SetupUseCase).createGame(newGame))).toBe(game);
    expect(repository.create).toHaveBeenCalledWith(newGame);
  });
});
