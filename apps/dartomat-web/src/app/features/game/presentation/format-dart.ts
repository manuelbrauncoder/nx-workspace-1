import { DartThrow } from '../domain/game';

/** Darts notation, the same in every language: `20`, `D20`, `T20`, `Bull`, `D-Bull`, `Miss`. */
export function formatDart(dart: DartThrow): string {
  if (dart.value === 0) {
    return 'Miss';
  }
  if (dart.value === 25) {
    return dart.multiplier === 2 ? 'D-Bull' : 'Bull';
  }
  return dart.multiplier === 1
    ? String(dart.value)
    : `${dart.multiplier === 2 ? 'D' : 'T'}${dart.value}`;
}

/** A checkout route as one line, e.g. `T19 · D12`. */
export function formatRoute(route: DartThrow[]): string {
  return route.map(formatDart).join(' · ');
}
