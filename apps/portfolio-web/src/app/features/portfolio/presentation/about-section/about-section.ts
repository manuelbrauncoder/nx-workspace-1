import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { UiText } from '@shared/ui/text/text';
import { About } from '../../domain/portfolio';
import { TrailMarker } from '../trail-marker/trail-marker';

/** "About me": portrait, a short introduction and the facts that describe how I work. */
@Component({
  selector: 'app-about-section',
  imports: [NgOptimizedImage, LocalizedPipe, UiText, TrailMarker],
  styleUrl: './about-section.scss',
  templateUrl: './about-section.html',
})
export class AboutSection {
  readonly about = input.required<About>();
}
