import { Component, computed, input } from '@angular/core';

/**
 * Where the map sits: `hero` fills the hero with two hills and the pin on Partenstein,
 * `corner` puts a single hill into the top right corner of a section.
 */
export type TopoMapVariant = 'hero' | 'corner';

interface Ring {
  transform: string;
  d: string;
  /** Index contour, drawn a little stronger like on a real topographic map. */
  major: boolean;
}

interface Hill {
  transform: string;
  rings: Ring[];
}

interface Drawing {
  viewBox: string;
  hills: Hill[];
  pin?: { x: number; y: number };
  /** `narrow` shows below `md`, `wide` from `md` on, `all` everywhere. */
  screen: 'all' | 'narrow' | 'wide';
}

/**
 * Closed outlines around 0,0 with a radius of about 100. Each ring is one of them scaled up,
 * the slightly different points let the rings drift apart like real contour lines.
 */
const OUTLINES = [
  'M0,-100 C60,-105 110,-55 105,5 C100,70 45,110 -15,100 C-80,92 -115,40 -105,-20 C-95,-75 -50,-98 0,-100 Z',
  'M0,-100 C62,-108 112,-50 106,8 C98,74 40,112 -20,102 C-84,90 -118,36 -104,-24 C-92,-78 -48,-96 0,-100 Z',
  'M0,-100 C64,-104 116,-58 104,10 C94,78 36,114 -24,100 C-88,86 -120,30 -102,-28 C-88,-80 -46,-97 0,-100 Z',
  'M0,-100 C66,-100 120,-62 102,14 C88,82 30,116 -30,98 C-92,80 -122,24 -100,-32 C-84,-84 -44,-98 0,-100 Z',
  'M0,-100 C70,-98 124,-66 100,18 C82,86 24,118 -36,96 C-96,74 -124,18 -98,-36 C-80,-86 -42,-99 0,-100 Z',
  'M0,-100 C74,-96 128,-70 98,22 C76,90 18,120 -42,94 C-100,68 -126,12 -96,-40 C-76,-88 -40,-100 0,-100 Z',
  'M0,-100 C78,-94 132,-74 96,26 C70,94 12,122 -48,92 C-104,62 -128,6 -94,-44 C-72,-90 -38,-101 0,-100 Z',
  'M0,-100 C82,-92 136,-78 94,30 C64,98 6,124 -54,90 C-108,56 -130,0 -92,-48 C-68,-92 -36,-102 0,-100 Z',
  'M0,-100 C86,-90 140,-82 92,34 C58,102 0,126 -60,88 C-112,50 -132,-6 -90,-52 C-64,-94 -34,-103 0,-100 Z',
];

const hill = (x: number, y: number, scales: number[], majors: number[] = []): Hill => ({
  transform: `translate(${x} ${y})`,
  rings: scales.map((scale, index) => ({
    transform: `scale(${scale})`,
    d: OUTLINES[index % OUTLINES.length],
    major: majors.includes(index),
  })),
});

const DRAWINGS: Record<TopoMapVariant, Drawing[]> = {
  hero: [
    // Phone: the hill sits above the name, in the top right corner.
    {
      viewBox: '0 0 390 680',
      hills: [hill(300, 120, [0.32, 0.7, 1.15, 1.65, 2.2, 2.85, 3.6, 4.5, 5.6], [2, 5])],
      pin: { x: 300, y: 120 },
      screen: 'narrow',
    },
    {
      viewBox: '0 0 1440 780',
      hills: [
        hill(1060, 300, [0.45, 0.95, 1.55, 2.2, 2.95, 3.8, 4.8, 6, 7.4], [2, 5]),
        hill(180, 740, [0.8, 1.6, 2.5], [2]),
      ],
      pin: { x: 1060, y: 300 },
      screen: 'wide',
    },
  ],
  corner: [
    {
      viewBox: '0 0 1440 780',
      hills: [hill(1300, 120, [1.4, 2.4, 3.5, 4.7])],
      screen: 'all',
    },
  ],
};

/**
 * Decorative contour map in the background of a section, hidden from assistive technology.
 * It fills its positioned parent and keeps its top right corner in view, so the pin stays
 * visible at every width. Colors come from the `--topo-line*` tokens.
 *
 * @example
 * <section class="relative overflow-hidden">
 *   <app-topo-map variant="hero" />
 *   ...
 * </section>
 */
@Component({
  selector: 'app-topo-map',
  styleUrl: './topo-map.scss',
  templateUrl: './topo-map.html',
  host: { 'aria-hidden': 'true' },
})
export class TopoMap {
  readonly variant = input<TopoMapVariant>('hero');
  /** Label of the pin. Without one the pin stands alone. */
  readonly place = input<string>();
  /** Shown below the place, not on a phone. */
  readonly coordinates = input<string>();

  private readonly _drawings = computed(() => DRAWINGS[this.variant()]);
}
