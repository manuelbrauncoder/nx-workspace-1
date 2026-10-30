import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/**
 * Tells a visitor of the hero that the page goes on: a trail marker walks down a dashed trail.
 * It is a real link to the next section, so it also works by keyboard. With reduced motion the
 * marker stands still.
 */
@Component({
  selector: 'app-scroll-cue',
  imports: [RouterLink, TranslatePipe],
  styleUrl: './scroll-cue.scss',
  templateUrl: './scroll-cue.html',
})
export class ScrollCue {}
