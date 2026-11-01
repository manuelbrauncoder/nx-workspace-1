import { inject, Service } from '@angular/core';
import { GamesRepository } from '@api/games/games.repository';
import { Observable } from 'rxjs';
import { DartThrow, Game } from './game';

/** What a running game can do. Passes the repository through for now. */
@Service({ autoProvided: false })
export class GameUseCase {
  private readonly _repository = inject(GamesRepository);

  getById(id: string): Observable<Game> {
    return this._repository.getById(id);
  }

  throwDart(id: string, dart: DartThrow): Observable<Game> {
    return this._repository.throwDart(id, dart);
  }

  undo(id: string): Observable<Game> {
    return this._repository.undo(id);
  }

  restart(id: string): Observable<Game> {
    return this._repository.restart(id);
  }

  setDoubleOut(id: string, doubleOut: boolean): Observable<Game> {
    return this._repository.setDoubleOut(id, doubleOut);
  }
}
