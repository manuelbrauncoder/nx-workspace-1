import { describe, expect, it } from 'vitest';
import { applyDart, isValidDart, turnDartsAfter, undoLast, type EngineGame } from './game301.js';

function game(doubleOut = true, scores = [301, 301]): EngineGame {
  return {
    doubleOut,
    players: scores.map((score) => ({ score })),
    currentPlayerIdx: 0,
    currentTurnDarts: [],
    history: [],
    winnerIdx: null,
  };
}

describe('game301', () => {
  it('subtracts the points from the current player', () => {
    const g = game();
    expect(applyDart(g, { multiplier: 3, value: 20 }).applied).toBe(true);
    expect(g.players[0]!.score).toBe(241);
    expect(g.currentTurnDarts).toEqual([{ multiplier: 3, value: 20, points: 60 }]);
  });

  it('passes on to the next player after three darts', () => {
    const g = game();
    for (let i = 0; i < 3; i++) applyDart(g, { multiplier: 1, value: 1 });
    expect(g.players[0]!.score).toBe(298);
    expect(g.currentPlayerIdx).toBe(1);
    expect(g.currentTurnDarts).toEqual([]);
  });

  it('resets the score to the start of the turn on a bust', () => {
    const g = game(true, [30, 301]);
    applyDart(g, { multiplier: 1, value: 10 });
    applyDart(g, { multiplier: 1, value: 20 }); // 0 on a single: bust with double-out
    expect(g.players[0]!.score).toBe(30);
    expect(g.currentPlayerIdx).toBe(1);
    expect(g.currentTurnDarts).toEqual([]);
  });

  it('busts on a rest of one with double-out', () => {
    const g = game(true, [21, 301]);
    applyDart(g, { multiplier: 1, value: 20 });
    expect(g.players[0]!.score).toBe(21);
    expect(g.currentPlayerIdx).toBe(1);
  });

  it('wins on a double with double-out and keeps the winning turn', () => {
    const g = game(true, [40, 301]);
    applyDart(g, { multiplier: 2, value: 20 });
    expect(g.winnerIdx).toBe(0);
    expect(g.currentTurnDarts).toEqual([{ multiplier: 2, value: 20, points: 40 }]);
    expect(applyDart(g, { multiplier: 1, value: 1 })).toEqual({ applied: false, reason: 'won' });
  });

  it('wins on a single with straight-out', () => {
    const g = game(false, [20, 301]);
    applyDart(g, { multiplier: 1, value: 20 });
    expect(g.winnerIdx).toBe(0);
  });

  it('takes back the last dart, also the winning one', () => {
    const g = game(true, [40, 301]);
    applyDart(g, { multiplier: 2, value: 20 });
    expect(undoLast(g)).not.toBeNull();
    expect(g.winnerIdx).toBeNull();
    expect(g.players[0]!.score).toBe(40);
    expect(g.history).toHaveLength(0);
    expect(undoLast(g)).toBeNull();
  });

  it('rebuilds the current turn from the last dart', () => {
    const g = game();
    const first = applyDart(g, { multiplier: 1, value: 5 });
    if (!first.applied) throw new Error('not applied');
    expect(turnDartsAfter(first.entry)).toEqual(g.currentTurnDarts);
  });

  it('knows the valid darts', () => {
    expect(isValidDart({ multiplier: 1, value: 0 })).toBe(true);
    expect(isValidDart({ multiplier: 2, value: 0 })).toBe(false);
    expect(isValidDart({ multiplier: 2, value: 25 })).toBe(true);
    expect(isValidDart({ multiplier: 3, value: 25 })).toBe(false);
    expect(isValidDart({ multiplier: 3, value: 21 })).toBe(false);
  });
});
