import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiIcon } from '@shared/ui/icon/icon';

/**
 * Tells a visitor of the hero that the page goes on: an arrow that keeps sliding down in a round
 * glass button, on a phone without the circle. It is a real link to the next section, so it also
 * works by keyboard. With reduced motion the arrow stands still.
 */
@Component({
  selector: 'app-scroll-cue',
  imports: [RouterLink, TranslatePipe, UiIcon],
  styleUrl: './scroll-cue.scss',
  templateUrl: './scroll-cue.html',
})
export class ScrollCue {}
