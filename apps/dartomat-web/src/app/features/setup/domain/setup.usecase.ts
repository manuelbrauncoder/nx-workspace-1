import { inject, Service } from '@angular/core';
import { GamesRepository } from '@api/games/games.repository';
import { Observable } from 'rxjs';
import { Game, NewGame } from './setup';

/** What the setup can do: start a game. Passes the repository through for now. */
@Service({ autoProvided: false })
export class SetupUseCase {
  private readonly _repository = inject(GamesRepository);

  createGame(newGame: NewGame): Observable<Game> {
    return this._repository.create(newGame);
  }
}
