import { Component, input } from '@angular/core';

/**
 * `blaze` is the painted trail marker with a dark band at its foot, next to a project title.
 * `bullet` is a plain one in front of a list item.
 */
export type TrailMarkerVariant = 'blaze' | 'bullet';

/**
 * The small yellow trail marker of the design. Decorative, hidden from assistive technology.
 *
 * @example
 * <h3><app-trail-marker />Kochwelt</h3>
 * <li><app-trail-marker variant="bullet" />Remote oder vor Ort</li>
 */
@Component({
  selector: 'app-trail-marker',
  styleUrl: './trail-marker.scss',
  templateUrl: './trail-marker.html',
  host: {
    'aria-hidden': 'true',
    '[class.trail-marker--bullet]': "variant() === 'bullet'",
  },
})
export class TrailMarker {
  readonly variant = input<TrailMarkerVariant>('blaze');
}
