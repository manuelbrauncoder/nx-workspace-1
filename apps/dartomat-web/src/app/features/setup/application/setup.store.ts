import { computed, inject, Service, signal } from '@angular/core';
import { mutation } from '@core/state/mutation';
import { Game, PLAYERS_MAX } from '../domain/setup';
import { SetupUseCase } from '../domain/setup.usecase';
import { RecentPlayers } from './recent-players';

/** How many of the remembered names are offered. */
const RECENT_SHOWN = 8;

/** The players of the next game and starting it. Provided in the feature routes. */
@Service({ autoProvided: false })
export class SetupStore {
  private readonly _useCase = inject(SetupUseCase);
  private readonly _recentPlayers = inject(RecentPlayers);

  private readonly _players = signal<string[]>([]);
  private readonly _remembered = signal<string[]>([]);
  private readonly _mutation = mutation();

  /** In the order they throw. */
  readonly players = this._players.asReadonly();
  readonly isFull = computed(() => this._players().length >= PLAYERS_MAX);
  readonly canStart = computed(() => this._players().length > 0);
  /** Names of earlier games on this device that are not in the list yet. */
  readonly recentNames = computed(() =>
    this._remembered()
      .filter((name) => !this.hasPlayer(name))
      .slice(0, RECENT_SHOWN),
  );
  /** State of starting the game. */
  readonly mutationState = this._mutation.state;

  /** Reads the remembered names. Only in the browser, so the server render stays the same. */
  loadRecent(): void {
    this._remembered.set(this._recentPlayers.load());
  }

  hasPlayer(name: string): boolean {
    const key = name.trim().toLowerCase();
    return this._players().some((player) => player.toLowerCase() === key);
  }

  /** Adds a name at the end; a blank or known name and a full list change nothing. */
  addPlayer(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || this.hasPlayer(trimmed) || this.isFull()) {
      return;
    }
    this._players.update((players) => [...players, trimmed]);
  }

  removePlayer(index: number): void {
    this._players.update((players) => players.filter((_, i) => i !== index));
  }

  /** Swaps the player with the one before (`-1`) or after (`1`). */
  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    this._players.update((players) => {
      if (target < 0 || target >= players.length) {
        return players;
      }
      const next = [...players];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  /** Starts the game and remembers the names. Resolves with `undefined` when it failed. */
  async start(doubleOut: boolean): Promise<Game | undefined> {
    const names = this._players();
    const game = await this._mutation.run(this._useCase.createGame({ names, doubleOut }));
    if (game) {
      this._recentPlayers.remember(names);
    }
    return game;
  }
}
