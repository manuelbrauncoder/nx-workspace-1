import { dartPoints, type Dart } from './game301.js';

/** Three-dart double-out scores without a finish. */
const BOGEY_3 = new Set([159, 162, 163, 165, 166, 168, 169]);

/** The usual three-dart double-out routes, where they differ from the first one the solver finds. */
const CURATED_3: Record<number, string> = {
  170: 'T20 T20 D25',
  167: 'T20 T19 D25',
  164: 'T20 T18 D25',
  161: 'T20 T17 D25',
  160: 'T20 T20 D20',
  158: 'T20 T20 D19',
  157: 'T20 T19 D20',
  156: 'T20 T20 D18',
  155: 'T20 T19 D19',
  154: 'T20 T18 D20',
  153: 'T20 T19 D18',
  152: 'T20 T20 D16',
  151: 'T20 T17 D20',
  150: 'T20 T18 D18',
  149: 'T20 T19 D16',
  148: 'T20 T16 D20',
  147: 'T20 T17 D18',
  146: 'T20 T18 D16',
  145: 'T20 T15 D20',
  144: 'T20 T20 D12',
  143: 'T20 T17 D16',
  142: 'T20 T14 D20',
  141: 'T20 T15 D18',
  140: 'T20 T20 D10',
  139: 'T19 T14 D20',
  138: 'T20 T18 D12',
  137: 'T20 T19 D10',
  136: 'T20 T20 D8',
  135: 'T20 T17 D12',
  134: 'T20 T14 D16',
  133: 'T20 T19 D8',
  132: 'T20 T20 D6',
  131: 'T20 T13 D16',
  130: 'T20 T20 D5',
  129: 'T19 T16 D12',
  128: 'T18 T14 D16',
  127: 'T20 T17 D8',
  126: 'T19 T19 D6',
  125: 'T20 T19 D4',
  124: 'T20 T16 D8',
  123: 'T19 T16 D9',
  122: 'T20 T18 D4',
  121: 'T20 T11 D14',
  120: 'T20 S20 D20',
  119: 'T19 T12 D13',
  118: 'T20 T18 D2',
  117: 'T20 S17 D20',
  116: 'T20 T16 D4',
  115: 'T20 S15 D20',
  114: 'T20 S14 D20',
  113: 'T20 S13 D20',
  112: 'T20 S12 D20',
  111: 'T20 S11 D20',
  110: 'T20 S10 D20',
  109: 'T20 S9 D20',
  108: 'T20 S8 D20',
  107: 'T19 T10 D10',
  106: 'T20 S6 D20',
  105: 'T20 S5 D20',
  104: 'T20 S4 D20',
  103: 'T19 S6 D20',
  102: 'T20 S2 D20',
  101: 'T20 S1 D20',
  100: 'T20 D20',
  99: 'T19 S10 D16',
  98: 'T20 D19',
  97: 'T19 D20',
  96: 'T20 D18',
  95: 'T19 D19',
  94: 'T20 D17',
  93: 'T19 D18',
  92: 'T20 D16',
  91: 'T19 D17',
  90: 'T20 D15',
  89: 'T19 D16',
  88: 'T20 D14',
  87: 'T19 D15',
  86: 'T20 D13',
  85: 'T19 D14',
  84: 'T20 D12',
  83: 'T19 D13',
  82: 'T20 D11',
  81: 'T19 D12',
  80: 'T20 D10',
  79: 'T19 D11',
  78: 'T20 D9',
  77: 'T19 D10',
  76: 'T20 D8',
  75: 'T19 D9',
  74: 'T20 D7',
  73: 'T19 D8',
  72: 'T20 D6',
  71: 'T19 D7',
  70: 'T20 D5',
  69: 'T19 D6',
  68: 'T20 D4',
  67: 'T19 D5',
  66: 'T20 D3',
  65: 'T19 D4',
  64: 'T20 D2',
  63: 'T19 D3',
  62: 'T20 D1',
  61: 'T19 D2',
  60: 'S20 D20',
};

function parseToken(token: string): Dart | null {
  const t = token.trim().toUpperCase();
  if (t === 'BULL' || t === '25') return { multiplier: 1, value: 25 };
  if (t === 'D25' || t === '50') return { multiplier: 2, value: 25 };
  const match = /^([TDS])(\d{1,2})$/.exec(t);
  if (!match) return null;
  const multiplier = match[1] === 'T' ? 3 : match[1] === 'D' ? 2 : 1;
  const value = Number(match[2]);
  if (value < 1 || value > 20) return null;
  return { multiplier, value };
}

function parseRoute(route: string): Dart[] {
  return route
    .split(/\s+/)
    .map(parseToken)
    .filter((dart): dart is Dart => dart !== null);
}

/** Every segment of the board, highest points first, so the solver tries big darts first. */
const ALL_SEGMENTS = (
  [
    ...Array.from({ length: 20 }, (_, i) =>
      ([1, 2, 3] as const).map((multiplier) => ({ multiplier, value: i + 1 })),
    ).flat(),
    { multiplier: 1, value: 25 },
    { multiplier: 2, value: 25 },
  ] satisfies Dart[]
).sort((a, b) => dartPoints(b) - dartPoints(a));

function maxFinishable(doubleOut: boolean, dartsLeft: number): number {
  if (dartsLeft <= 0) return 0;
  if (doubleOut) return [0, 50, 110, 170][Math.min(dartsLeft, 3)] ?? 170;
  return Math.min(180, 60 * dartsLeft);
}

/** A route of exactly `darts` darts that finishes `score`, or null. */
function solve(score: number, darts: number, doubleOut: boolean): Dart[] | null {
  if (score <= 0 || darts <= 0) return null;
  if (doubleOut && score === 1) return null;

  const search = (remaining: number, left: number): Dart[] | null => {
    if (remaining === 0) return left === 0 ? [] : null;
    if (left <= 0 || remaining < 0) return null;
    if (doubleOut && remaining === 1) return null;

    if (left === 1) {
      const last = ALL_SEGMENTS.find(
        (dart) => dartPoints(dart) === remaining && (!doubleOut || dart.multiplier === 2),
      );
      return last ? [last] : null;
    }

    for (const dart of ALL_SEGMENTS) {
      const points = dartPoints(dart);
      if (points >= remaining) continue;
      if (doubleOut && remaining - points === 1) continue;
      const tail = search(remaining - points, left - 1);
      if (tail) return [dart, ...tail];
    }
    return null;
  };

  return search(score, darts);
}

/** The route with the fewest darts, at most `maxDarts`. */
function shortestRoute(score: number, doubleOut: boolean, maxDarts: number): Dart[] | null {
  for (let darts = 1; darts <= maxDarts; darts++) {
    const route = solve(score, darts, doubleOut);
    if (route) return route;
  }
  return null;
}

const CHECKOUT_CHART = new Map<number, Dart[]>();
for (let score = 2; score <= 170; score++) {
  if (BOGEY_3.has(score)) continue;
  const curated = CURATED_3[score];
  const route = curated ? parseRoute(curated) : shortestRoute(score, true, 3);
  if (route) CHECKOUT_CHART.set(score, route);
}

export interface CheckoutRecommendation {
  status: 'hidden' | 'ok' | 'impossible';
  route: Dart[] | null;
}

/**
 * The way out for `score` with the darts left in the turn. `hidden` while the score is out of
 * reach, `impossible` when it is in reach but cannot be finished (e.g. 1 with double-out).
 */
export function recommendCheckout(input: {
  score: number;
  dartsLeft: number;
  doubleOut: boolean;
}): CheckoutRecommendation {
  const { score, dartsLeft, doubleOut } = input;
  const hidden: CheckoutRecommendation = { status: 'hidden', route: null };

  if (!Number.isInteger(score) || score <= 0) return hidden;
  if (!Number.isInteger(dartsLeft) || dartsLeft <= 0) return hidden;
  if (score > maxFinishable(doubleOut, dartsLeft)) return hidden;

  const route =
    doubleOut && dartsLeft >= 3
      ? (CHECKOUT_CHART.get(score) ?? null)
      : shortestRoute(score, doubleOut, dartsLeft);

  return route ? { status: 'ok', route } : { status: 'impossible', route: null };
}
