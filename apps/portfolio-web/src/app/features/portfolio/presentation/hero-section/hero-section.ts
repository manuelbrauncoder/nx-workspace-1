import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { Hero } from '../../domain/portfolio';
import { HeroLens } from '../hero-lens/hero-lens';
import { ScrollCue } from '../scroll-cue/scroll-cue';

/**
 * First screen of the start page: the name and "Frontend Developer" under a glass sphere that
 * magnifies them, two calls to action and the arrow to the next section. The description and
 * the map fields of the hero stay in the CMS but are not shown.
 */
@Component({
  selector: 'app-hero-section',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    UiButton,
    UiIcon,
    UiText,
    HeroLens,
    ScrollCue,
  ],
  styleUrl: './hero-section.scss',
  templateUrl: './hero-section.html',
})
export class HeroSection {
  readonly hero = input.required<Hero>();
}
