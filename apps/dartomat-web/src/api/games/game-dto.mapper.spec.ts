import { TestBed } from '@angular/core/testing';
import { GameDtoMapper } from './game-dto.mapper';
import { GameDto } from './game.dto';

const DTO: GameDto = {
  id: 'g1',
  startScore: 301,
  doubleOut: true,
  status: 'finished',
  players: [{ id: 'p1', name: 'Ada', score: 0 }],
  currentPlayerIdx: 0,
  currentTurnDarts: [{ multiplier: 2, value: 20, points: 40 }],
  winnerIdx: 0,
  checkout: { status: 'hidden', route: null },
  canUndo: true,
  createdAt: '2026-11-01T09:00:00.000Z',
  finishedAt: '2026-11-01T09:20:00.000Z',
};

describe('GameDtoMapper', () => {
  const mapper = () => TestBed.inject(GameDtoMapper);

  it('maps the dates and an empty checkout route', () => {
    const game = mapper().toModel(DTO);

    expect(game.finishedAt).toEqual(new Date(DTO.finishedAt!));
    expect(game.checkout).toEqual({ status: 'hidden', route: [] });
  });

  it('maps back to the wire format', () => {
    expect(mapper().toDto(mapper().toModel(DTO))).toEqual(DTO);
  });
});
