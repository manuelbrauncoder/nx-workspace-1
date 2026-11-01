import { formatDart, formatRoute } from './format-dart';

describe('formatDart', () => {
  it('writes darts in the usual notation', () => {
    expect(formatDart({ multiplier: 1, value: 20 })).toBe('20');
    expect(formatDart({ multiplier: 2, value: 12 })).toBe('D12');
    expect(formatDart({ multiplier: 3, value: 19 })).toBe('T19');
    expect(formatDart({ multiplier: 1, value: 25 })).toBe('Bull');
    expect(formatDart({ multiplier: 2, value: 25 })).toBe('D-Bull');
    expect(formatDart({ multiplier: 1, value: 0 })).toBe('Miss');
  });

  it('joins a route', () => {
    expect(
      formatRoute([
        { multiplier: 3, value: 19 },
        { multiplier: 2, value: 12 },
      ]),
    ).toBe('T19 · D12');
  });
});
