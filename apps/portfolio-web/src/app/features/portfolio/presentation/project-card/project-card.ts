import { NgOptimizedImage } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { Project } from '../../domain/portfolio';
import { TrailMarker } from '../trail-marker/trail-marker';

/** One project: screenshot next to name, description, stack and the links to try it. */
@Component({
  selector: 'app-project-card',
  imports: [NgOptimizedImage, LocalizedPipe, TranslatePipe, UiIcon, UiText, TrailMarker],
  styleUrl: './project-card.scss',
  templateUrl: './project-card.html',
  host: { '[class.project-card--reversed]': 'reversed()' },
})
export class ProjectCard {
  readonly project = input.required<Project>();
  /** Puts the screenshot on the right from `md` on, so the projects alternate down the page. */
  readonly reversed = input(false, { transform: booleanAttribute });
  /** Lets the browser load the first screenshot early, it is the largest image on the page. */
  readonly priority = input(false, { transform: booleanAttribute });
}
