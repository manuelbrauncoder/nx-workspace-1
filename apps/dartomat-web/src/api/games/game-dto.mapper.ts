import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { DartThrow, Game, NewGame } from './game';
import { CreateGameDto, GameDto, ThrowDartDto } from './game.dto';

@Service()
export class GameDtoMapper extends DtoMapper<GameDto, Game> {
  toModel(dto: GameDto): Game {
    return {
      id: dto.id,
      startScore: dto.startScore,
      doubleOut: dto.doubleOut,
      status: dto.status,
      players: dto.players.map((player) => ({ ...player })),
      currentPlayerIdx: dto.currentPlayerIdx,
      currentTurnDarts: dto.currentTurnDarts.map((dart) => ({ ...dart })),
      winnerIdx: dto.winnerIdx,
      checkout: { status: dto.checkout.status, route: dto.checkout.route ?? [] },
      canUndo: dto.canUndo,
      createdAt: new Date(dto.createdAt),
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
    };
  }

  toDto(game: Game): GameDto {
    return {
      id: game.id,
      startScore: game.startScore,
      doubleOut: game.doubleOut,
      status: game.status,
      players: game.players.map((player) => ({ ...player })),
      currentPlayerIdx: game.currentPlayerIdx,
      currentTurnDarts: game.currentTurnDarts.map((dart) => ({ ...dart })),
      winnerIdx: game.winnerIdx,
      checkout: {
        status: game.checkout.status,
        route: game.checkout.status === 'ok' ? game.checkout.route : null,
      },
      canUndo: game.canUndo,
      createdAt: game.createdAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() ?? null,
    };
  }

  /** Names are sent trimmed, in the order they throw. */
  toCreateDto(newGame: NewGame): CreateGameDto {
    return { names: newGame.names.map((name) => name.trim()), doubleOut: newGame.doubleOut };
  }

  toThrowDto(dart: DartThrow): ThrowDartDto {
    return { multiplier: dart.multiplier, value: dart.value };
  }
}
