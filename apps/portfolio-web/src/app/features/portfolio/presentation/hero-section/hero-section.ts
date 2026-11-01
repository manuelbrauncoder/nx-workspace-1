import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { Hero } from '../../domain/portfolio';
import { ScrollCue } from '../scroll-cue/scroll-cue';
import { TopoMap } from '../topo-map/topo-map';

/** First screen of the start page: the name on a contour map of the Spessart. */
@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, LocalizedPipe, TranslatePipe, UiButton, UiText, ScrollCue, TopoMap],
  styleUrl: './hero-section.scss',
  templateUrl: './hero-section.html',
})
export class HeroSection {
  readonly hero = input.required<Hero>();

  /** First and last name on a line each, as on a trail sign. */
  private readonly _nameLines = computed(() => this.hero().name.split(' '));
}
