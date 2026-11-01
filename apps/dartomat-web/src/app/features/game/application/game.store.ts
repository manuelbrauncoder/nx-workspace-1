import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { Observable } from 'rxjs';
import { DartThrow, Game, Player } from '../domain/game';
import { GameUseCase } from '../domain/game.usecase';

export interface Standing extends Player {
  rank: number;
  isWinner: boolean;
}

/** The game on `/game/:id`. Provided in the feature routes, so it lives as long as the feature. */
@Service({ autoProvided: false })
export class GameStore {
  private readonly _useCase = inject(GameUseCase);

  private readonly _id = signal<string | undefined>(undefined);
  private readonly _game = rxResource({
    params: () => this._id(),
    stream: ({ params: id }) => this._useCase.getById(id),
  });
  // Darts follow each other, so one write at a time is enough.
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly game = computed(() => (this._game.hasValue() ? this._game.value() : undefined));
  readonly gameState = asyncState(this._game);
  /** The API does not know the game, or the id in the link is not one at all. */
  readonly notFound = computed(() => {
    const kind = this.gameState().failure?.kind;
    return kind === 'not-found' || kind === 'bad-request';
  });

  /** State of the most recent dart, undo or change. */
  readonly mutationState = this._mutation.state;
  /** A write is on its way; further taps wait for it. */
  readonly busy = computed(() => this._mutation.state().loadingState === 'loading');

  readonly isFinished = computed(() => this.game()?.status === 'finished');
  readonly currentPlayer = computed(() => {
    const game = this.game();
    return game?.players[game.currentPlayerIdx];
  });
  readonly winner = computed(() => {
    const game = this.game();
    return game?.winnerIdx != null ? game.players[game.winnerIdx] : undefined;
  });
  /** Lowest score first; ties keep the throwing order. */
  readonly standings = computed<Standing[]>(() => {
    const game = this.game();
    if (!game) {
      return [];
    }
    return game.players
      .map((player, idx) => ({ player, idx }))
      .sort((a, b) => a.player.score - b.player.score || a.idx - b.idx)
      .map(({ player, idx }, i) => ({ ...player, rank: i + 1, isWinner: idx === game.winnerIdx }));
  });

  load(id: string): void {
    this._id.set(id);
    this._mutation.reset();
  }

  reload(): void {
    this._game.reload();
  }

  throwDart(dart: DartThrow): Promise<Game | undefined> {
    return this._write((id) => this._useCase.throwDart(id, dart));
  }

  undo(): Promise<Game | undefined> {
    return this._write((id) => this._useCase.undo(id));
  }

  /** Same players, every score back to the start. Also after the game is won. */
  restart(): Promise<Game | undefined> {
    return this._write((id) => this._useCase.restart(id));
  }

  setDoubleOut(doubleOut: boolean): Promise<Game | undefined> {
    return this._write((id) => this._useCase.setDoubleOut(id, doubleOut));
  }

  /** Every answer carries the whole game, it replaces the loaded one. */
  private async _write(operation: (id: string) => Observable<Game>): Promise<Game | undefined> {
    const id = this._id();
    if (!id || this.busy()) {
      return undefined;
    }
    const game = await this._mutation.run(operation(id));
    if (game) {
      this._game.set(game);
    }
    return game;
  }
}
