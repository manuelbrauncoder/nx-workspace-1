import { describe, expect, it } from 'vitest';
import { recommendCheckout } from './checkout.js';
import { dartPoints } from './game301.js';

describe('recommendCheckout', () => {
  it('finishes every three-dart double-out score except the bogeys', () => {
    const bogeys = [159, 162, 163, 165, 166, 168, 169];
    for (let score = 2; score <= 170; score++) {
      const { status, route } = recommendCheckout({ score, dartsLeft: 3, doubleOut: true });
      if (bogeys.includes(score)) {
        expect(status, `score ${score}`).toBe('impossible');
        continue;
      }
      expect(status, `score ${score}`).toBe('ok');
      expect(route!.length).toBeLessThanOrEqual(3);
      expect(
        route!.reduce((sum, dart) => sum + dartPoints(dart), 0),
        `score ${score}`,
      ).toBe(score);
      expect(route!.at(-1)!.multiplier, `score ${score}`).toBe(2);
    }
  });

  it('uses the usual routes', () => {
    expect(recommendCheckout({ score: 170, dartsLeft: 3, doubleOut: true }).route).toEqual([
      { multiplier: 3, value: 20 },
      { multiplier: 3, value: 20 },
      { multiplier: 2, value: 25 },
    ]);
    expect(recommendCheckout({ score: 81, dartsLeft: 2, doubleOut: true }).route).toEqual([
      { multiplier: 3, value: 19 },
      { multiplier: 2, value: 12 },
    ]);
  });

  it('suggests the fewest darts with fewer than three left', () => {
    expect(recommendCheckout({ score: 40, dartsLeft: 2, doubleOut: true }).route).toEqual([
      { multiplier: 2, value: 20 },
    ]);
    const straight = recommendCheckout({ score: 20, dartsLeft: 1, doubleOut: false }).route;
    expect(straight).toHaveLength(1);
    expect(dartPoints(straight![0]!)).toBe(20);
  });

  it('hides out-of-reach scores and reports impossible ones', () => {
    expect(recommendCheckout({ score: 171, dartsLeft: 3, doubleOut: true }).status).toBe('hidden');
    expect(recommendCheckout({ score: 60, dartsLeft: 1, doubleOut: true }).status).toBe('hidden');
    expect(recommendCheckout({ score: 40, dartsLeft: 0, doubleOut: true }).status).toBe('hidden');
    expect(recommendCheckout({ score: 1, dartsLeft: 3, doubleOut: true }).status).toBe(
      'impossible',
    );
    expect(recommendCheckout({ score: 49, dartsLeft: 1, doubleOut: true }).status).toBe(
      'impossible',
    );
  });
});
